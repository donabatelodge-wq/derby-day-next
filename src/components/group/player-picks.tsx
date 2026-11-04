"use client";

import { useState } from "react";

const LOCK_MINUTES = 30;

// When picks lock for a meeting: first race time minus 30 minutes, worked out on
// the device's clock exactly like the pick screen. Returns null (nothing is
// revealed) if the meeting has no race times or any time isn't a clean HH:MM.
function lockTimeFor(meeting: any, raceTimes: any[]): number | null {
  const times = raceTimes
    .filter(r => r.meeting_id === meeting.id)
    .map(r => String(r.race_time ?? "").trim())
    .filter(t => t !== "");
  if (times.length === 0 || times.some(t => !/^\d{2}:\d{2}$/.test(t))) return null;
  const first = [...times].sort()[0];
  const ms = new Date(`${String(meeting.date).slice(0, 10)}T${first}:00`).getTime();
  return Number.isNaN(ms) ? null : ms - LOCK_MINUTES * 60 * 1000;
}

function posLabel(pos: number | null) {
  if (pos === 1) return { text: "🥇 1st", color: "text-amber-600 bg-amber-50 border-amber-200" };
  if (pos === 2) return { text: "🥈 2nd", color: "text-slate-600 bg-slate-100 border-slate-200" };
  if (pos === 3) return { text: "🥉 3rd", color: "text-orange-600 bg-orange-50 border-orange-200" };
  return null;
}

// "See picks" for one player on the leaderboard. Each day unlocks on its own, once
// that day's picks have locked. Nothing is shown for a day before then.
export function PlayerPicks({ email, entries, meetings, raceTimes, now, onlyMeetingId }: {
  email: string;
  entries: any[];
  meetings: any[];
  raceTimes: any[];
  now: Date;
  onlyMeetingId: string | null;
}) {
  const [open, setOpen] = useState(false);

  const days = meetings
    .filter(m => !onlyMeetingId || m.id === onlyMeetingId)
    .slice()
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .map(m => {
      const lock = lockTimeFor(m, raceTimes);
      return { meeting: m, revealed: lock !== null && now.getTime() >= lock };
    });

  if (days.length === 0) return null;
  const anyRevealed = days.some(d => d.revealed);

  return (
    <div className="px-6 pb-4 -mt-1">
      <button
        type="button"
        disabled={!anyRevealed}
        onClick={() => setOpen(o => !o)}
        className={`text-xs font-semibold px-3 py-1.5 rounded-lg border ${
          anyRevealed ? "text-green-700 border-green-300 bg-green-50 active:scale-95" : "text-slate-400 border-slate-200 bg-slate-50"
        }`}
      >
        {anyRevealed ? (open ? "Hide picks" : "See picks") : "Picks available after lock"}
      </button>

      {open && anyRevealed && (
        <div className="mt-3 space-y-4">
          {days.map(({ meeting, revealed }) => {
            const entry = entries.find(e => e.user_email === email && e.meeting_id === meeting.id && e.submitted);
            const p1 = meeting.points_1st ?? 3;
            const p2 = meeting.points_2nd ?? 2;
            const p3 = meeting.points_3rd ?? 1;
            const bc1 = meeting.best_chance_multiplier_1st ?? 2;
            const bc2 = meeting.best_chance_multiplier_2nd ?? 2;
            const bc3 = meeting.best_chance_multiplier_3rd ?? 2;
            const calcPoints = (sel: any) => {
              if (!sel.finish_position) return 0;
              const base = sel.finish_position === 1 ? p1 : sel.finish_position === 2 ? p2 : sel.finish_position === 3 ? p3 : 0;
              const mult = sel.finish_position === 1 ? bc1 : sel.finish_position === 2 ? bc2 : sel.finish_position === 3 ? bc3 : 1;
              return sel.is_best_chance ? base * mult : base;
            };
            const selections = entry
              ? [...(entry.selections || [])].sort((a: any, b: any) => (a.race_number ?? 0) - (b.race_number ?? 0))
              : [];

            return (
              <div key={meeting.id}>
                <p className="text-xs font-semibold mb-1.5" style={{ color: "var(--text-muted)" }}>{meeting.name}</p>
                {!revealed ? (
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>Available after picks lock.</p>
                ) : !entry ? (
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>No picks submitted.</p>
                ) : (
                  <div className="space-y-1.5">
                    {selections.map((sel: any) => {
                      const label = posLabel(sel.finish_position ?? null);
                      const pts = calcPoints(sel);
                      return (
                        <div key={sel.race_id ?? sel.race_number}
                          className="flex items-center justify-between text-sm rounded-xl px-3 py-2"
                          style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                          <div className="flex-1 min-w-0">
                            <span className="text-xs" style={{ color: "var(--text-muted)" }}>Race {sel.race_number}</span>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-medium" style={{ color: "var(--text-primary)" }}>{sel.horse_name || "No pick"}</span>
                              {sel.is_best_chance && <span className="text-amber-500 text-xs font-semibold">★ Best Chance</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {label && <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${label.color}`}>{label.text}</span>}
                            <span className={`font-bold text-sm ${pts > 0 ? "text-green-600" : "text-slate-300"}`}>{pts}pt{pts !== 1 ? "s" : ""}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
