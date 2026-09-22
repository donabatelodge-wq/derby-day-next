import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getStripe } from "@/lib/stripe";
import { packForPlayers, nextPackTier } from "@/lib/pricing";

// Creates a Stripe Checkout Session for either:
//  - kind 'initial': the first player-capacity pack, on a group the caller
//    just created in 'pending_payment' status (paid for the tier already set
//    on the group at creation time).
//  - kind 'upgrade': moving an already-active group up to the next pack tier
//    when it hits its player cap. Charges the incremental price only.
export async function POST(request: NextRequest) {
  try {
    const { groupId, kind } = await request.json();
    if (!groupId || (kind !== "initial" && kind !== "upgrade")) {
      return NextResponse.json({ error: "Missing or invalid groupId/kind" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // RLS (owner_email = self OR admin) already ensures this only succeeds
    // for a group the caller actually owns, but we check explicitly too so
    // the error message is meaningful rather than a bare "not found".
    const { data: group, error: groupError } = await supabase
      .from("groups").select("*").eq("id", groupId).single();
    if (groupError || !group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }
    if (group.owner_email !== user.email) {
      return NextResponse.json({ error: "Only the group owner can pay for this group" }, { status: 403 });
    }

    // The price and target tier are derived server-side, never trusted from
    // the client.
    let targetTier: number;
    let priceCents: number;
    let productName: string;

    if (kind === "initial") {
      if (group.status !== "pending_payment") {
        return NextResponse.json({ error: "This group is not awaiting payment" }, { status: 400 });
      }
      const pack = packForPlayers(group.max_players);
      targetTier = pack.players;
      priceCents = pack.price * 100;
      productName = `Derby Day — ${pack.players}-player competition pack`;
    } else {
      if (group.status !== "active") {
        return NextResponse.json({ error: "This group isn't active yet" }, { status: 400 });
      }
      const currentPack = packForPlayers(group.max_players);
      const next = nextPackTier(group.max_players);
      if (!next) {
        return NextResponse.json({ error: "This group is already at the maximum player tier" }, { status: 400 });
      }
      targetTier = next.players;
      priceCents = (next.price - currentPack.price) * 100;
      productName = `Derby Day — upgrade to ${next.players} players`;
    }

    const origin = request.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "";

    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      line_items: [{
        price_data: {
          currency: group.currency || "eur",
          product_data: { name: productName },
          unit_amount: priceCents,
        },
        quantity: 1,
      }],
      success_url: `${origin}/group/new/success?groupId=${group.id}&kind=${kind}&expectMaxPlayers=${targetTier}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/group/new/cancel?groupId=${group.id}&kind=${kind}`,
      metadata: { groupId: group.id, kind, playerTier: String(targetTier) },
    });

    // group_purchases has no client-writable RLS policy by design — only
    // server code that has already verified ownership (as this route just
    // did) may record a purchase, via the service role client.
    const service = createServiceClient();
    const { error: purchaseError } = await service.from("group_purchases").insert({
      group_id: group.id,
      stripe_checkout_session_id: session.id,
      kind,
      player_tier: targetTier,
      amount_cents: priceCents,
      currency: group.currency || "eur",
      status: "pending",
    });
    if (purchaseError) {
      return NextResponse.json({ error: `Failed to record purchase: ${purchaseError.message}` }, { status: 500 });
    }

    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Checkout failed" }, { status: 500 });
  }
}
