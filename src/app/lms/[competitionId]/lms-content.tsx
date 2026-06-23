"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Swords, AlertCircle, CheckCircle2, BookOpen } from "lucide-react";
import { toast } from "sonner";
import LmsTeamPicker from "@/components/lms/lms-team-picker";
import LmsStandings from "@/components/lms/lms-standings";

const PL_TEAMS = [
  "Arsenal","Aston Villa","Bournemouth","Brentford","Brighton","Chelsea",
  "Crystal Palace","Everton","Fulham","Ipswich Town","Leicester City","Liverpool",
  "Manchester City","Manchester United","Newcastle United","Nottingham Forest",
  "Southampton","Tottenham Hotspur","West Ham United","Wolverhampton Wanderers"
];

export default function LmsContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();
  const competitionId = params.competitionId as string;
  const groupId = searchParams.get("groupId") || "";
  const initialTab = searchParams.get("tab") || "pick";

  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [competition, setCompetition] = useState<any>(null);
  const [group, setGroup] = useState<any>(null);
  const [picks, setPicks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [myPick, setMyPick] = useState<any>(null);
  const [selectedTeam, setSelectedTeam] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [activeTab, setActiveTab] = useState(initialTab);

  const loadData = useCallback(async () => {
    const { data: { user: u } } = await supabase.auth.getUser();
    if (!u) { router.push("/login"); return; }
    setUser(u);

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", u.id).single();
    setIsAdmin(profile?.role === "admin");

    const [{ data: compData }, { data: groupData }, { data: picksData }] = await Promise.all([
      supabase.from("lms_competitions").select("*").eq("id", competitionId).single(),
      supabase.from("groups").select("*").eq("id", groupId).single(),
      supabase.from("lms_picks").select("*").eq("competition_id", competitionId),
    ]);

    setCompetition(compData);
    setGroup(groupData);
    setPicks(picksData ?? []);

    if (u && compData) {
      const existing = (picksData ?? []).find((p: any) => p.user_email === u.email && p.week_number === compData.current_week);
      setMyPick(existing || null);
      setSelectedTeam(existing?.team || "");
      const isElim = (picksData ?? []).some((p: any) => p.user_email === u.email && p.result === "eliminated");
      if (isElim) setActiveTab("standings");
    }
    setLoading(false);
  }, [competitionId, groupId]);

  useEffect(() => { loadData(); }, [loadData]);

  const submitPick = async () => {
    if (!selectedTeam || !user || !competition) return;
    setSubmitting(true);
    try {
      if (myPick) {
        await supabase.from("lms_picks").update({ team: selectedTeam }).eq("id", myPick.id);
        setMyPick({ ...myPick, team: selectedTeam });
      } else {
        const { data: created } = await supabase.from("lms_picks").insert({
          competition_id: competition.id,
          group_id: groupId,
          user_email: user.email,
          user_name: user.email,
          week_number: competition.current_week,
          team: selectedTeam,
          result: "pending",
        }).select().single();
        setMyPick(created);
      }
      setSubmitted(true);
      toast.success(`Pick saved: ${selectedTeam}`);
    } catch {
      toast.error("Failed to save pick. Please try again.");
    }
    setSubmitting(false);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
      <div className="w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!competition) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
      <p style={{ color: "var(--text-muted)" }}>Competition not found.</p>
    </div>
  );

  const isOwner = user?.email === group?.owner_email;
  const myPicks = picks.filter(p => p.user_email === user?.email);
  const usedTeams = myPicks.map(p => p.team);
  const eliminatedTeams = myPicks.filter(p => p.result === "eliminated").map(p => p.team);
  const iAmEliminated = myPicks.some(p => p.result === "eliminated");
  const deadlinePassed = competition.week_deadline && new Date(competition.week_deadline) < new Date();

  const memberEmails = group?.member_emails || [];
  const participants = memberEmails.map((email: string) => {
    const memberPicks = picks.filter(p => p.user_email === email);
    const isEliminated = memberPicks.some(p => p.result === "eliminated");
    const eliminatedPick = memberPicks.find(p => p.result === "eliminated");
    const currentWeekPick = memberPicks.find(p => p.week_number === competition.current_week);
    const weeksAlive = isEliminated
      ? (eliminatedPick ? eliminatedPick.week_number - 1 : 0)
      : memberPicks.filter(p => p.result === "win").length;
    return {
      email,
      name: (group?.member_names || {})[email] || email.split("@")[0],
      status: isEliminated ? "eliminated" : "alive" as "alive" | "eliminated",
      weeksAlive,
      eliminatedWeek: eliminatedPick?.week_number,
      currentPick: currentWeekPick?.team,
    };
  });

  const teams = competition.teams?.length > 0 ? competition.teams : PL_TEAMS;

  const tabs = [
    ...(iAmEliminated ? [] : [{ id: "pick", label: "Pick Team" }]),
    { id: "standings", label: "Standings" },
    { id: "rules", label: "Rules" },
    ...((isOwner || isAdmin) ? [{ id: "admin", label: "Admin" }] : []),
  ];

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <div className="max-w-2xl mx-auto px-4 py-10 pb-24">

        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Swords className="w-5 h-5 text-purple-500" />
            <span className="text-xs font-semibold tracking-widest text-purple-500 uppercase">Last Man Standing</span>
          </div>
          <h1 className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>{competition.name}</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            {group?.name} · Week {competition.current_week}
          </p>
        </div>

        {iAmEliminated && (
          <div className="mb-6 rounded-2xl p-4 bg-red-50 border border-red-200 flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
            <div>
              <p className="font-semibold text-red-700">You&apos;ve been eliminated</p>
              <p className="text-sm text-red-500">Your team lost. Better luck next season!</p>
            </div>
          </div>
        )}

        <div className="flex gap-1 mb-5 rounded-xl p-1" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id); setSubmitted(false); }}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${activeTab === tab.id ? "bg-purple-600 text-white" : ""}`}
              style={activeTab !== tab.id ? { color: "var(--text-muted)" } : {}}>
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "pick" && (
          <div className="space-y-4">
            {myPicks.filter(p => p.week_number < competition.current_week).length > 0 && (
              <div className="rounded-2xl border overflow-hidden" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
                <div className="px-5 py-3 border-b" style={{ borderColor: "var(--border)" }}>
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>My Previous Picks</p>
                </div>
                <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                  {myPicks.filter(p => p.week_number < competition.current_week).sort((a, b) => a.week_number - b.week_number).map(p => (
                    <div key={p.id} className="flex items-center justify-between px-5 py-2.5">
                      <div>
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>Week {p.week_number}</span>
                        <span className="text-sm font-medium ml-3" style={{ color: "var(--text-primary)" }}>{p.team}</span>
                      </div>
                      {p.result === "win" && <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">✓ Win</span>}
                      {p.result === "eliminated" && <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">✗ Out</span>}
                      {p.result === "pending" && <span className="text-xs font-bold text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full">Pending</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!iAmEliminated && (
              <div className="rounded-2xl border overflow-hidden" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
                <div className="px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
                  <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Week {competition.current_week} — Pick your team</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Greyed = already used · Crossed out = lost with that team</p>
                </div>
                <div className="p-4">
                  {submitted && (
                    <div className="mb-4 rounded-xl p-3 bg-purple-50 border border-purple-200 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-purple-600" />
                      <p className="text-sm font-medium text-purple-700">Pick saved: <strong>{selectedTeam}</strong></p>
                    </div>
                  )}
                  <LmsTeamPicker
                    usedTeams={usedTeams}
                    eliminatedTeams={eliminatedTeams}
                    currentPick={selectedTeam}
                    onPick={(t) => { setSelectedTeam(t); setSubmitted(false); }}
                    disabled={deadlinePassed}
                    teams={teams}
                  />
                  {!deadlinePassed && (
                    <button onClick={submitPick} disabled={!selectedTeam || submitting}
                      className="w-full mt-4 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm disabled:opacity-50">
                      {submitting ? "Saving..." : myPick ? `Update Pick: ${selectedTeam}` : `Submit Pick: ${selectedTeam || "Select a team"}`}
                    </button>
                  )}
                  {deadlinePassed && myPick && (
                    <p className="text-center text-sm mt-3 font-medium" style={{ color: "var(--text-muted)" }}>
                      Your pick: <strong>{myPick.team}</strong> · Awaiting results
                    </p>
                  )}
                  {deadlinePassed && !myPick && (
                    <p className="text-center text-sm mt-3 text-red-500">Deadline passed — no pick submitted this week.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "standings" && (
          <LmsStandings participants={participants} currentUserEmail={user?.email} competition={competition} />
        )}

        {activeTab === "rules" && (
          <div className="rounded-2xl border p-5 space-y-3" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-4 h-4 text-purple-500" />
              <h2 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Competition Rules</h2>
            </div>
            {competition.rules ? (
              <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: "var(--text-secondary)" }}>{competition.rules}</p>
            ) : (
              <div className="text-sm space-y-2" style={{ color: "var(--text-secondary)" }}>
                <p className="font-semibold" style={{ color: "var(--text-primary)" }}>Default Rules</p>
                <ul className="space-y-1">
                  <li>• Each team can only be picked once per player across the entire competition.</li>
                  <li>• Pick one team per round before the deadline.</li>
                  <li>• <span className="text-green-600 font-semibold">Win</span>: your team wins — you stay in.</li>
                  <li>• <span className="text-amber-600 font-semibold">Draw or Loss</span>: you are eliminated.</li>
                  <li>• Missed picks result in elimination.</li>
                  <li>• The last player remaining wins.</li>
                </ul>
              </div>
            )}
          </div>
        )}

        {activeTab === "admin" && (isOwner || isAdmin) && (
          <div className="rounded-2xl border p-5" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
            <p className="font-semibold text-sm mb-3" style={{ color: "var(--text-primary)" }}>Admin Actions</p>
            <a href={`/admin/lms-results?competitionId=${competition.id}&groupId=${groupId}`}
              className="block w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold text-center transition-colors">
              Enter Week {competition.current_week} Results →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
