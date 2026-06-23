"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CheckCircle2, XCircle, ArrowLeft, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function AdminLmsResultsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();
  const competitionId = searchParams.get("competitionId") || "";
  const groupId = searchParams.get("groupId") || "";

  const [competition, setCompetition] = useState<any>(null);
  const [group, setGroup] = useState<any>(null);
  const [picks, setPicks] = useState<any[]>([]);
  const [teamStates, setTeamStates] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      if (profile?.role !== "admin") { router.push("/"); return; }
      setIsAdmin(true);

      const [{ data: comp }, { data: grp }, { data: allPicks }] = await Promise.all([
        supabase.from("lms_competitions").select("*").eq("id", competitionId).single(),
        supabase.from("groups").select("*").eq("id", groupId).single(),
        supabase.from("lms_picks").select("*").eq("competition_id", competitionId),
      ]);
      setCompetition(comp);
      setGroup(grp);
      setPicks(allPicks ?? []);
      setLoading(false);
    };
    init();
  }, [competitionId, groupId]);

  const currentWeek = competition?.current_week || 1;

  const eliminatedEmails = new Set(
    picks.filter(p => p.result === "eliminated" && p.week_number < currentWeek).map(p => p.user_email)
  );
  const allMemberEmails = group?.member_emails || [];
  const activePlayers = allMemberEmails.filter((email: string) => !eliminatedEmails.has(email));
  const currentWeekPicks = picks.filter(p => p.week_number === currentWeek);
  const activePickedTeams = new Set(
    currentWeekPicks.filter(p => activePlayers.includes(p.user_email)).map(p => p.team)
  );
  const alreadyEntered = competition?.weeks?.some((w: any) => w.week_number === currentWeek && w.results_entered);

  const toggleTeam = (team: string) => {
    if (alreadyEntered) return;
    setTeamStates(prev => {
      const cur = prev[team];
      if (!cur) return { ...prev, [team]: "win" };
      if (cur === "win") return { ...prev, [team]: "loss" };
      return { ...prev, [team]: null };
    });
  };

  const winTeams = Object.entries(teamStates).filter(([, v]) => v === "win").map(([k]) => k);

  const handleConfirm = async () => {
    if (saving || alreadyEntered) return;
    setSaving(true);

    const updates = [];
    for (const pick of currentWeekPicks) {
      if (!activePlayers.includes(pick.user_email)) continue;
      const result = winTeams.includes(pick.team) ? "win" : "eliminated";
      updates.push(supabase.from("lms_picks").update({ result }).eq("id", pick.id));
    }
    for (const email of activePlayers) {
      const hasPick = currentWeekPicks.some(p => p.user_email === email);
      if (!hasPick) {
        updates.push(supabase.from("lms_picks").insert({
          competition_id: competitionId,
          group_id: groupId,
          user_email: email,
          user_name: group?.member_names?.[email] || email,
          week_number: currentWeek,
          team: "(no pick)",
          result: "eliminated",
        }));
      }
    }

    const existingWeeks = competition.weeks || [];
    const updatedWeeks = [
      ...existingWeeks.filter((w: any) => w.week_number !== currentWeek),
      { week_number: currentWeek, results_entered: true, winning_teams: winTeams },
    ];
    updates.push(supabase.from("lms_competitions").update({
      weeks: updatedWeeks, current_week: currentWeek + 1, week_deadline: null,
    }).eq("id", competition.id));

    await Promise.all(updates);
    toast.success(`Week ${currentWeek} results confirmed!`);
    setSaving(false);
    router.push(`/group/${groupId}`);
  };

  if (loading || !isAdmin) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
      <div className="w-8 h-8 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!competition) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
      <p style={{ color: "var(--text-muted)" }}>Competition not found.</p>
    </div>
  );

  const teams = competition.teams || [];

  return (
    <div className="min-h-screen pb-36" style={{ background: "var(--bg)" }}>
      <div style={{ background: "var(--bg-card)", borderBottom: "1px solid var(--border)" }} className="px-4 py-3">
        <Link href={`/group/${groupId}`} className="flex items-center gap-1 text-sm mb-2" style={{ color: "var(--text-secondary)" }}>
          <ArrowLeft className="w-4 h-4" /> Back to Group
        </Link>
        <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>{competition.name}</h1>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{group?.name} · Week {currentWeek}</p>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {alreadyEntered && (
          <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-amber-800 font-medium">Results have already been entered for Week {currentWeek}.</p>
          </div>
        )}

        <div className="flex gap-3">
          <div className="flex-1 bg-green-50 border border-green-200 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-green-700">{winTeams.length}</div>
            <div className="text-xs text-green-600 font-medium">Win teams</div>
          </div>
          <div className="flex-1 bg-red-50 border border-red-200 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-red-700">
              {Object.values(teamStates).filter(v => v === "loss").length}
            </div>
            <div className="text-xs text-red-600 font-medium">Draw / Loss teams</div>
          </div>
        </div>

        <p className="text-xs text-center" style={{ color: "var(--text-muted)" }}>
          Tap once → <span className="text-green-600 font-medium">Win ✓</span> &nbsp;|&nbsp;
          Tap twice → <span className="text-red-600 font-medium">Draw/Loss ✗</span> &nbsp;|&nbsp;
          Tap again → Unmark &nbsp;|&nbsp;
          <span className="text-yellow-600 font-medium">Yellow</span> = picked this week
        </p>

        <div className="space-y-2">
          {teams.map((team: string) => {
            const state = teamStates[team] || null;
            const isPicked = activePickedTeams.has(team);
            let borderColor = "#e2e8f0";
            let bg = "#ffffff";
            let textColor = "#475569";
            if (state === "win") { borderColor = "#22c55e"; bg = "#f0fdf4"; textColor = "#166534"; }
            else if (state === "loss") { borderColor = "#ef4444"; bg = "#fef2f2"; textColor = "#991b1b"; }
            else if (isPicked) { borderColor = "#facc15"; }
            return (
              <button key={team} onClick={() => toggleTeam(team)} disabled={alreadyEntered}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all text-left font-medium"
                style={{ borderColor, background: bg, color: textColor, opacity: alreadyEntered ? 0.6 : 1 }}>
                <span>{team}</span>
                <span className="flex items-center gap-2">
                  {isPicked && !state && <span className="text-xs text-yellow-600 font-semibold">picked</span>}
                  {state === "win" && <CheckCircle2 className="w-5 h-5 text-green-600" />}
                  {state === "loss" && <XCircle className="w-5 h-5 text-red-600" />}
                </span>
              </button>
            );
          })}
          {teams.length === 0 && (
            <p className="text-center py-8" style={{ color: "var(--text-muted)" }}>No teams found for this competition.</p>
          )}
        </div>
      </div>

      {!alreadyEntered && (
        <div className="fixed bottom-0 left-0 right-0 px-4 pt-3"
          style={{ background: "var(--bg-card)", borderTop: "1px solid var(--border)", paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}>
          <div className="max-w-lg mx-auto">
            <button onClick={handleConfirm} disabled={saving || winTeams.length === 0}
              className="w-full bg-green-600 text-white font-bold py-3 rounded-xl disabled:opacity-50 transition-opacity">
              {saving ? "Saving…" : `Confirm Results & Advance to Week ${currentWeek + 1}`}
            </button>
            {winTeams.length === 0 && (
              <p className="text-xs text-center mt-2" style={{ color: "var(--text-muted)" }}>Select at least one winning team to confirm</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
