import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/service";

// Stripe webhook: the only thing allowed to move a group from 'pending_payment'
// to 'active', and the only writer of group_purchases besides the checkout
// route. Runs entirely on the service role client (no user session exists
// here) — signature verification against STRIPE_WEBHOOK_SECRET is what proves
// this request actually came from Stripe, since RLS provides no protection
// for a request with no authenticated user at all.
export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (e: any) {
    return NextResponse.json({ error: `Invalid signature: ${e.message}` }, { status: 400 });
  }

  const service = createServiceClient();

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const groupId = session.metadata?.groupId;
    const kind = session.metadata?.kind;

    if (!groupId || (kind !== "initial" && kind !== "upgrade")) {
      // Unrecognized session — acknowledge so Stripe doesn't keep retrying.
      return NextResponse.json({ received: true });
    }

    const { data: purchase } = await service
      .from("group_purchases")
      .select("*")
      .eq("stripe_checkout_session_id", session.id)
      .single();

    if (!purchase) {
      return NextResponse.json({ error: "No matching purchase record" }, { status: 404 });
    }
    if (purchase.status === "paid") {
      // Stripe redelivered this event — already processed, idempotent no-op.
      return NextResponse.json({ received: true });
    }

    const paymentIntentId =
      typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null;

    const { error: purchaseError } = await service
      .from("group_purchases")
      .update({ status: "paid", stripe_payment_intent_id: paymentIntentId })
      .eq("id", purchase.id);
    if (purchaseError) {
      return NextResponse.json({ error: `Failed to update purchase: ${purchaseError.message}` }, { status: 500 });
    }

    if (kind === "initial") {
      // Only activate if still pending — never clobber a group an admin has
      // already touched (e.g. manually archived) in the meantime.
      const { error: groupError } = await service
        .from("groups")
        .update({ status: "active" })
        .eq("id", groupId)
        .eq("status", "pending_payment");
      if (groupError) {
        return NextResponse.json({ error: `Failed to activate group: ${groupError.message}` }, { status: 500 });
      }
    } else {
      // upgrade: raise the player cap to the purchased tier. The idempotency
      // check above (purchase.status === "paid") already prevents this from
      // double-applying on a redelivered webhook event.
      const { error: groupError } = await service
        .from("groups")
        .update({ max_players: purchase.player_tier })
        .eq("id", groupId);
      if (groupError) {
        return NextResponse.json({ error: `Failed to raise player limit: ${groupError.message}` }, { status: 500 });
      }
    }
  }

  if (event.type === "checkout.session.expired") {
    const session = event.data.object as Stripe.Checkout.Session;
    // Mark the abandoned purchase attempt. The group itself just stays in
    // 'pending_payment' — the creator can retry payment any time; there's
    // nothing to clean up on the groups row.
    await service
      .from("group_purchases")
      .update({ status: "expired" })
      .eq("stripe_checkout_session_id", session.id)
      .eq("status", "pending");
  }

  return NextResponse.json({ received: true });
}
