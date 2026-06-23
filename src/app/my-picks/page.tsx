"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Trophy, Star, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

export default function MyPicksPage() {
  const router = useRouter();
  const supabase = createClient();

  const [entries, setEntries] = useState<any[]>([]);
  const [meetings, setMeetings] = useState<Record<string, any>>({});
  const [races, setRaces] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUserEmail(user.email ?? "");

      const [{ data: entryList }, { data: meetingList }, { data: raceList }] = await Promise.all([
        supabase.from("entries").select("*").eq("user_email", user.email).order("created_at", { ascending: false }),
        supabase.from("meetings").select("*"),
        supabase.from("races").select("*"),
      ]);

      const meetingMap: Record<string, any> = {};
      (meetingList ?? []).forEach(m => { meetingMap[m.id] = m; });
      const raceMap: Record<string, any> = {};
      (raceList ?? []).forEach(r => { raceMap[r.id] = r; });

      setEntries(entryList ?? []);
      setMeetings(meetingMap);
      setRaces(raceMap);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <div className="max-w-2xl mx-auto px-4 py-8 pb-24">

        <div className="flex items-center gap-3 mb-6">
          <Trophy className="w-5 h-5 text-amber-500" />
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>My Picks</h1>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-16 rounded-2xl border" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
            <Trophy className="w-8 h-8 mx-auto mb-3 opacity-30" style={{ color: "var(--text-muted)" }} />
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>No entries yet.</p>
            <Link href="/" className="mt-4 inline-block text-sm text-green-600 font-semibold hover:underline">
              Browse competitions →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {entries.map(entry => {
              const meeting = meetings[entry.meeting_id];
              return (
                <div key={entry.id} className="rounded-2xl border overflow-hidden" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
                  <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
                    <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{meeting?.name || "Meeting"}</p>
                    {meeting?.date && (
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                        {format(new Date(meeting.date), "d MMM yyyy")}
                      </p>
                    )}
                  </div>
                  <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                    {(entry.selections || []).sort((a: any, b: any) => a.race_number - b.race_number).map((sel: any) => {
                      const race = races[sel.race_id];
                      const mtg = meetings[entry.meeting_id] || {};
                      const p1 = mtg.points_1st ?? 3;
                      const p2 = mtg.points_2nd ?? 2;
                      const p3 = mtg.points_3rd ?? 1;
                      const bc1 = mtg.best_chance_multiplier_1st ?? 2;
                      const bc2 = mtg.best_chance_multiplier_2nd ?? 2;
                      const bc3 = mtg.best_chance_multiplier_3rd ?? 2;
                      let pts = 0;
                      if (race?.result_entered) {
                        if (sel.horse_name === race.result_1st) pts = sel.is_best_chance ? p1 * bc1 : p1;
                        else if (sel.horse_name === race.result_2nd) pts = sel.is_best_chance ? p2 * bc2 : p2;
                        else if (sel.horse_name === race.result_3rd) pts = sel.is_best_chance ? p3 * bc3 : p3;
                      }
                      return (
                        <div key={sel.race_id} className="flex items-center justify-between px-4 py-2.5">
                          <div>
                            <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                              Race {sel.race_number}{race?.race_name ? ` · ${race.race_name}` : ""}
                            </p>
                            <p className="text-sm font-semibold mt-0.5" style={{ color: "var(--text-primary)" }}>{sel.horse_name}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {sel.is_best_chance && (
                              <span className="flex items-center gap-1 text-xs font-semibold text-amber-500 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                                <Star className="w-3 h-3" /> Best Chance
                              </span>
                            )}
                            {pts > 0 && (
                              <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                                <CheckCircle className="w-3 h-3" /> +{pts}pts
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {entry.total_points > 0 && (
                    <div className="px-4 py-2 border-t flex items-center justify-between" style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
                      <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Total Points</span>
                      <span className="text-sm font-bold text-amber-500">{entry.total_points} pts</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
