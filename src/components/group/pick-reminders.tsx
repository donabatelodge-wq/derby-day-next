"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Clock } from "lucide-react";

const COOLDOWN_MS = 3 * 60 * 60 * 1000;

function dayLabel(d: string) {
  try { return format(new Date(d), "d MMM"); } catch { return d; }
}

// Organiser-only card: emails players who haven't submitted their selections
// for a chosen meeting. One reminder can go out every 3 hours.
export function PickReminders({ group, meetings, raceCounts, entries, onGroupUpdate }: {
  group: any;
  meetings: any[];
  raceCounts: Record<string, number>;
  entries: any[];
  onGroupUpdate: (u: any) => void;
}) {
  const sorted = [...meetings].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const todayStr = new Date().toISOString().slice(0, 10);
  const preferred =
    sorted.find(m => String(m.date).slice(0, 10) >= todayStr && !["closed", "completed"].includes(m.status)) || sorted[0];

  const [meetingId, setMeetingId] = useState<string>(preferred?.id ?? "");
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [edited, setEdited] = useState(false);
  const [sending, setSending] = useState(false);

  const meeting = sorted.find(m => m.id === meetingId) || sorted[0];
  const organiserName =
    (group.member_names || {})[group.owner_email] || String(group.owner_email).split("@")[0];

  // Keep the default message in step with the chosen meeting until the
  // organiser starts editing it.
  useEffect(() => {
    if (open && !edited && meeting) {
      setText(
        `Hi! A quick reminder from ${organiserName}: your selections for ${meeting.name} in ${group.name} aren't in yet. Please get them in before the first race. Good luck!`
      );
    }
  }, [open, meetingId]);

  if (sorted.length === 0 || !meeting) return null;

  const owner = String(group.owner_email).trim().toLowerCase();
  const submitted = new Set(
    entries
      .filter(e => e.meeting_id === meeting.id && e.submitted)
      .map(e => String(e.user_email).trim().toLowerCase())
  );
  const missing: string[] = Array.from(
    new Set<string>((group.member_emails || []).map((e: string) => String(e).trim().toLowerCase()))
  ).filter((e: string) => e && e !== owner && !submitted.has(e));

  const racesAvailable = (raceCounts[meeting.id] || 0) > 0;
  const closed =
    ["closed", "completed"].includes(meeting.status) ||
    (meeting.close_at && new Date(meeting.close_at).getTime() < Date.now());

  const last = group.last_picks_reminder_at ? new Date(group.last_picks_reminder_at).getTime() : 0;
  const msLeft = last ? COOLDOWN_MS - (Date.now() - last) : 0;
  const coolingDown = msLeft > 0;
  const waitLabel = (() => {
    const mins = Math.ceil(msLeft / 60000);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  })();
  const lastLabel = (() => {
    if (!last) return null;
    try { return format(new Date(last), "d MMM, HH:mm"); } catch { return null; }
  })();

  const send = async () => {
    setSending(true);
    try {
      const res = await fetch("/api/groups/remind-picks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId: group.id, meetingId: meeting.id, message: text }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Couldn't send the reminder. Please try again.");
      } else {
        toast.success(`Reminder sent to ${data.sent} player${data.sent !== 1 ? "s" : ""}.`);
        onGroupUpdate({ last_picks_reminder_at: new Date().toISOString() });
        setOpen(false);
      }
    } catch {
      toast.error("Couldn't send the reminder. Please try again.");
    }
    setSending(false);
  };

  return (
    <div className="rounded-3xl border p-5 space-y-3" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
      <div className="flex items-center gap-2">
        <Clock className="w-5 h-5 text-green-500" />
        <h2 className="font-semibold text-base" style={{ color: "var(--text-primary)" }}>Pick reminders</h2>
      </div>
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
        Email the players who haven&apos;t submitted their selections for a meeting. Players who have submitted never get it.
      </p>

      <div>
        <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-muted)" }}>Meeting</label>
        <select value={meeting.id}
          onChange={e => { setMeetingId(e.target.value); setEdited(false); }}
          disabled={sending}
          className="w-full h-12 rounded-xl border px-3 text-base bg-white"
          style={{ borderColor: "var(--border)" }}>
          {sorted.map(m => (
            <option key={m.id} value={m.id}>{m.name} · {dayLabel(m.date)}</option>
          ))}
        </select>
      </div>

      {!racesAvailable ? (
        <p className="text-sm rounded-xl px-3 py-2 bg-amber-50 text-amber-700 border border-amber-200">
          Races for this meeting haven&apos;t been added yet. You can send a reminder once they are.
        </p>
      ) : closed ? (
        <p className="text-sm rounded-xl px-3 py-2 bg-slate-50 text-slate-600 border border-slate-200">
          Selections for this meeting have closed.
        </p>
      ) : missing.length === 0 ? (
        <p className="text-sm font-semibold text-green-600">Everyone has submitted ✓</p>
      ) : !open ? (
        <>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {missing.length} player{missing.length !== 1 ? "s haven't" : " hasn't"} submitted yet.
          </p>
          <button onClick={() => setOpen(true)} disabled={coolingDown}
            className="w-full h-12 rounded-2xl text-white text-sm font-bold transition-all active:scale-95 disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)" }}>
            {coolingDown ? `Next reminder in ${waitLabel}` : `Remind ${missing.length} player${missing.length !== 1 ? "s" : ""} to pick`}
          </button>
        </>
      ) : (
        <div className="space-y-3">
          <textarea value={text} onChange={e => { setText(e.target.value); setEdited(true); }}
            maxLength={1000} rows={5}
            className="w-full rounded-xl border px-3 py-2 text-base"
            style={{ borderColor: "var(--border)" }} />
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {text.length}/1000 · Goes to {missing.length} player{missing.length !== 1 ? "s" : ""}, each by their own email, with a button to make their selections. Replies come to you.
          </p>
          <div className="flex gap-2">
            <button onClick={send} disabled={sending || !text.trim()}
              className="flex-1 h-12 rounded-2xl text-white text-sm font-bold disabled:opacity-50 transition-all active:scale-95"
              style={{ background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)" }}>
              {sending ? "Sending..." : `Send to ${missing.length} player${missing.length !== 1 ? "s" : ""}`}
            </button>
            <button onClick={() => setOpen(false)} disabled={sending}
              className="px-4 h-12 rounded-2xl border border-slate-200 text-sm font-semibold text-slate-600">Cancel</button>
          </div>
        </div>
      )}

      {lastLabel && (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Last pick reminder sent {lastLabel}. One can be sent every 3 hours.
        </p>
      )}
    </div>
  );
}
