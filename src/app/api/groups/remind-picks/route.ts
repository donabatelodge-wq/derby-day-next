import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const COOLDOWN_MS = 3 * 60 * 60 * 1000;
const MAX_MESSAGE = 1000;
const MAX_RECIPIENTS = 200;

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Organiser-only: emails a reminder to the group's members who haven't
// submitted their selections for one meeting. Each player gets their own
// email (nobody sees other addresses), replies go to the organiser, and a
// group can send one pick reminder every 3 hours.
export async function POST(request: NextRequest) {
  try {
    const { groupId, meetingId, message } = await request.json();
    if (!groupId || !meetingId || typeof message !== "string") {
      return NextResponse.json({ error: "Missing groupId, meetingId or message" }, { status: 400 });
    }
    const text = message.trim();
    if (!text) {
      return NextResponse.json({ error: "Please write a message." }, { status: 400 });
    }
    if (text.length > MAX_MESSAGE) {
      return NextResponse.json({ error: `Message is too long (max ${MAX_MESSAGE} characters).` }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL;
    if (!apiKey || !from) {
      return NextResponse.json({ error: "Reminder emails aren't set up yet." }, { status: 500 });
    }

    const { data: groupRow, error: groupError } = await supabase
      .from("groups").select("*").eq("id", groupId).single();
    if (groupError || !groupRow) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }
    const group: any = groupRow;
    if (group.owner_email !== user.email) {
      return NextResponse.json({ error: "Only the group organiser can send reminders" }, { status: 403 });
    }
    if (["archived", "finalised", "pending_payment"].includes(group.status)) {
      return NextResponse.json({ error: "Reminders can't be sent for this group." }, { status: 400 });
    }
    if (!(group.meeting_ids ?? []).includes(meetingId)) {
      return NextResponse.json({ error: "That meeting isn't part of this group." }, { status: 400 });
    }

    // Service client: the organiser's own session may not be allowed to read
    // other players' entries, but the server needs the full picture.
    const service = createServiceClient();
    const db: any = service;

    const { data: meeting } = await db
      .from("meetings").select("id, name, date, status, close_at").eq("id", meetingId).single();
    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }
    if (
      ["closed", "completed"].includes(meeting.status) ||
      (meeting.close_at && new Date(meeting.close_at).getTime() < Date.now())
    ) {
      return NextResponse.json({ error: "Selections for this meeting have closed." }, { status: 400 });
    }

    const { count: raceCount } = await db
      .from("races").select("id", { count: "exact", head: true }).eq("meeting_id", meetingId);
    if (!raceCount) {
      return NextResponse.json({ error: "Races for this meeting haven't been added yet." }, { status: 400 });
    }

    const { data: submittedRows } = await db
      .from("entries").select("user_email")
      .eq("group_id", groupId).eq("meeting_id", meetingId).eq("submitted", true);
    const submitted = new Set<string>(
      (submittedRows ?? []).map((r: any) => String(r.user_email).trim().toLowerCase())
    );

    const owner = String(group.owner_email).trim().toLowerCase();
    const recipients: string[] = Array.from(
      new Set<string>((group.member_emails ?? []).map((e: string) => String(e).trim().toLowerCase()))
    )
      .filter((e: string) => e && e !== owner && !submitted.has(e))
      .slice(0, MAX_RECIPIENTS);

    if (recipients.length === 0) {
      return NextResponse.json({ error: "Everyone has already submitted their selections." }, { status: 400 });
    }

    // Claim the 3-hour slot atomically before sending, so two quick taps
    // can't send twice. Put it back if nothing goes out.
    const previous = group.last_picks_reminder_at ?? null;
    const cutoff = new Date(Date.now() - COOLDOWN_MS).toISOString();
    const { data: claimed, error: claimError } = await db
      .from("groups")
      .update({ last_picks_reminder_at: new Date().toISOString() })
      .eq("id", groupId)
      .or(`last_picks_reminder_at.is.null,last_picks_reminder_at.lt.${cutoff}`)
      .select("id");
    if (claimError) {
      return NextResponse.json({ error: "Couldn't send the reminder. Please try again." }, { status: 500 });
    }
    if (!claimed || claimed.length === 0) {
      return NextResponse.json({ error: "A pick reminder was already sent in the last 3 hours." }, { status: 429 });
    }

    const organiserName =
      (group.member_names ?? {})[group.owner_email] || String(group.owner_email).split("@")[0];
    const origin = request.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "";
    const link = origin ? `${origin}/enter-tips?meetingId=${meetingId}&groupId=${groupId}` : "";
    const subject = `Your selections for ${meeting.name}`;
    const footer =
      "Sent by Derby Day on behalf of the organiser. Entry arrangements are between you and the organiser. " +
      "Derby Day doesn't collect or handle entry fees or prizes. Reply to this email to reach the organiser.";

    const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#0f172a">
  <p style="font-size:13px;color:#64748b;margin:0 0 12px">Message from your organiser, ${esc(organiserName)}, about <strong>${esc(group.name)}</strong> · ${esc(meeting.name)}</p>
  <div style="font-size:16px;line-height:1.5;white-space:pre-wrap;margin:0 0 20px">${esc(text)}</div>
  ${link ? `<p style="margin:0 0 24px"><a href="${esc(link)}" style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:10px">Make my selections</a></p>` : ""}
  <p style="font-size:12px;color:#94a3b8;line-height:1.4;margin:0">${esc(footer)}</p>
</div>`;
    const plain = `Message from your organiser, ${organiserName}, about ${group.name} · ${meeting.name}\n\n${text}\n\n${link ? link + "\n\n" : ""}${footer}`;

    let sent = 0;
    let failure: string | null = null;
    for (let i = 0; i < recipients.length; i += 100) {
      const chunk = recipients.slice(i, i + 100).map(to => ({
        from,
        to: [to],
        reply_to: user.email,
        subject,
        html,
        text: plain,
      }));
      const res = await fetch("https://api.resend.com/emails/batch", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(chunk),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        failure = err?.message || "The email service refused the request.";
        break;
      }
      sent += chunk.length;
    }

    if (sent === 0) {
      await db.from("groups").update({ last_picks_reminder_at: previous }).eq("id", groupId);
      return NextResponse.json({ error: failure || "Couldn't send the reminder." }, { status: 502 });
    }

    return NextResponse.json({ sent, failed: recipients.length - sent });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Couldn't send the reminder." }, { status: 500 });
  }
}
