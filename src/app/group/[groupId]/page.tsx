"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getLeaderboard, getGroupStatus } from "@/lib/leaderboard";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Trophy, Users, Calendar, ChevronRight, Plus, X,
  DollarSign, Swords, Clock, PlayCircle, CheckCircle2, Trash2, AlertTriangle, Archive, UserMinus
} from "lucide-react";
import Link from "next/link";
import type { Group, Meeting, Entry } from "@/lib/types";

const STATUS_CONFIG = {
  upcoming:    { label: "Upcoming",    Icon: Clock,        color: "text-blue-600",  bg: "bg-blue-50",  border: "border-blue-200"  },
  in_progress: { label: "In Progress", Icon: PlayCircle,   color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
  completed:   { label: "Completed",   Icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50", border: "border-green-200" },
};

function DeleteGroupModal({ group, status, onConfirmDelete, onConfirmArchive, onClose }: {
  group: Group; status: string;
  onConfirmDelete: () => Promise<void>; onConfirmArchive: () => Promise<void>; onClose: () => void;
}) {
  const [step, setStep] = useState<"initial"|"confirm_delete">("initial");
  const [busy, setBusy] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const isCompleted = status === "completed";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }}>
      <div className="w-full max-w-sm rounded-2xl p-6 space-y-4 bg-white text-slate-900">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isCompleted ? "bg-red-100" : "bg-amber-100"}`}>
              {isCompleted ? <Trash2 className="w-5 h-5 text-red-600" /> : <Archive className="w-5 h-5 text-amber-600" />}
            </div>
            <h3 className="font-bold text-base">{isCompleted ? "Delete Group" : "Manage Group"}</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100"><X className="w-4 h-4 text-slate-400" /></button>
        </div>
        <p className="text-sm font-semibold">&ldquo;{group.name}&rdquo;</p>
        {!isCompleted && step === "initial" && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">This group is <strong>{status === "upcoming" ? "Upcoming" : "In Progress"}</strong>. Archive to hide without losing data, or permanently delete.</p>
            <button onClick={async () => { setBusy(true); await onConfirmArchive(); setBusy(false); }}
              disabled={busy} className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm">
              {busy ? "Archiving..." : "Archive Group"}
            </button>
            <button onClick={() => setStep("confirm_delete")} className="w-full text-sm text-red-500 hover:text-red-600 font-medium py-1">Delete permanently instead</button>
          </div>
        )}
        {isCompleted && step === "initial" && (
          <div className="space-y-3">
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800">
              <div className="flex items-center gap-1.5 font-bold mb-1"><AlertTriangle className="w-3.5 h-3.5" /> This will permanently delete all group data.</div>
              <p className="font-semibold">This cannot be undone.</p>
            </div>
            <button onClick={() => setStep("confirm_delete")} className="w-full py-2.5 rounded-xl border border-red-300 text-red-600 text-sm font-semibold">I understand, continue</button>
          </div>
        )}
        {step === "confirm_delete" && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">Type the group name to confirm:</p>
            <input value={confirmName} onChange={e => setConfirmName(e.target.value)}
              placeholder={`Type "${group.name}"`}
              className="w-full h-10 rounded-xl border px-3 text-sm" />
            <button onClick={async () => { setBusy(true); await onConfirmDelete(); setBusy(false); }}
              disabled={confirmName.trim() !== group.name.trim() || busy}
              className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm disabled:opacity-50">
              {busy ? "Deleting..." : "Delete Permanently"}
            </button>
            <button onClick={() => setStep("initial")} className="w-full text-sm py-1 text-slate-400 hover:text-slate-600">Go back</button>
          </div>
        )}
        <button onClick={onClose} className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold">Cancel</button>
      </div>
    </div>
  );
}

function GroupMembersTab({ group, payments, currentUserEmail, onGroupUpdate }: {
  group: Group; payments: any[]; currentUserEmail: string | null; onGroupUpdate: (u: Partial<Group>) => void;
}) {
  const [removing, setRemoving] = useState<string|null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string|null>(null);
  const supabase = createClient();
  const members = group.member_emails || [];
  const memberNames = group.member_names || {};
  const paidEmails = new Set(payments.filter(p => p.status === "paid").map(p => p.user_email));

  const handleRemove = async (email: string) => {
    setRemoving(email);
    const updatedEmails = members.filter(e => e !== email);
    const updatedNames = { ...memberNames };
    delete updatedNames[email];
    await supabase.from("groups").update({ member_emails: updatedEmails, member_names: updatedNames }).eq("id", group.id);
    onGroupUpdate({ member_emails: updatedEmails, member_names: updatedNames });
    setRemoving(null);
    setConfirmRemove(null);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border overflow-hidden" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
        <div className="px-5 py-4 border-b flex items-center gap-2" style={{ borderColor: "var(--border)" }}>
          <Users className="w-4 h-4 text-green-500" />
          <h2 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Members ({members.length}/{group.max_players || 20})</h2>
        </div>
        {members.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>No members yet.</div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {members.map(email => {
              const name = memberNames[email] || email.split("@")[0];
              const isOwner = email === group.owner_email;
              const hasPaid = group.entry_fee_enabled ? paidEmails.has(email) : null;
              const isMe = email === currentUserEmail;
              return (
                <div key={email} className="px-5 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-slate-500">{name.charAt(0).toUpperCase()}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{name}</p>
                          {isOwner && <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">Owner</span>}
                          {isMe && !isOwner && <span className="text-xs text-green-500 font-semibold">(you)</span>}
                          {hasPaid === true && <span className="text-xs px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold">Paid</span>}
                          {hasPaid === false && <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-50 text-red-500 font-semibold">Unpaid</span>}
                        </div>
                        <p className="text-xs text-slate-400">{email}</p>
                      </div>
                    </div>
                    {!isOwner && !isMe && (
                      confirmRemove === email ? (
                        <div className="flex gap-2">
                          <button onClick={() => handleRemove(email)} disabled={!!removing}
                            className="text-xs px-3 py-1.5 rounded-lg bg-red-500 text-white font-semibold">
                            {removing === email ? "..." : "Remove"}
                          </button>
                          <button onClick={() => setConfirmRemove(null)} className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500">Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmRemove(email)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-400 transition-colors">
                          <UserMinus className="w-4 h-4" />
                        </button>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function GroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.groupId as string;
  const supabase = createClient();

  const [currentUserEmail, setCurrentUserEmail] = useState<string|null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [group, setGroup] = useState<Group|null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [allMeetings, setAllMeetings] = useState<Meeting[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [lmsCompetitions, setLmsCompetitions] = useState<any[]>([]);
  const [lmsPicks, setLmsPicks] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [raceCounts, setRaceCounts] = useState<Record<string,number>>({});
  const [firstRaceDeadline, setFirstRaceDeadline] = useState<Date|null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("leaderboard");
  const [selectedMeetingId, setSelectedMeetingId] = useState<string|null>(null);
  const [showAddMeeting, setShowAddMeeting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showCreateLms, setShowCreateLms] = useState(false);
  const [newLmsName, setNewLmsName] = useState("");
  const [creatingLms, setCreatingLms] = useState(false);
  const [finalising, setFinalising] = useState(false);
  const [finalised, setFinalised] = useState(false);
  const [hasPaid, setHasPaid] = useState(true);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setCurrentUserEmail(user.email ?? null);

      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      setIsAdmin(profile?.role === "admin");

      const [{ data: g }, { data: allM }] = await Promise.all([
        supabase.from("groups").select("*").eq("id", groupId).single(),
        supabase.from("meetings").select("*"),
      ]);

      if (!g) { setLoading(false); return; }
      setGroup(g as Group);
      setAllMeetings((allM ?? []) as Meeting[]);

      const groupMeetings = (allM ?? []).filter((m: any) => (g.meeting_ids ?? []).includes(m.id)) as Meeting[];
      setMeetings(groupMeetings);

      const [{ data: entriesData }, { data: lmsData }, { data: paymentsData }] = await Promise.all([
        supabase.from("entries").select("*").eq("group_id", groupId),
        supabase.from("lms_competitions").select("*").eq("group_id", groupId),
        g.entry_fee_enabled
          ? supabase.from("group_payments").select("*").eq("group_id", groupId)
          : Promise.resolve({ data: [] }),
      ]);

      setEntries((entriesData ?? []) as Entry[]);
      setLmsCompetitions(lmsData ?? []);
      setPayments(paymentsData ?? []);

      if (groupMeetings.length > 0) {
        const { data: allRaces } = await supabase.from("races").select("id, meeting_id").in("meeting_id", groupMeetings.map(m => m.id));
        const countsMap: Record<string,number> = {};
        groupMeetings.forEach(m => { countsMap[m.id] = (allRaces ?? []).filter((r: any) => r.meeting_id === m.id).length; });
        setRaceCounts(countsMap);
      }

      const todayStr = new Date().toISOString().slice(0, 10);
      const dailyEntry = (g.daily_meeting_ids ?? []).find((d: any) => d.date === todayStr);
      const fallbackMeeting = !dailyEntry ? groupMeetings.find(m => m.date === todayStr) : null;
      const todayMeetingId = dailyEntry?.meeting_id || fallbackMeeting?.id;
      if (todayMeetingId) {
        const { data: todayRaces } = await supabase.from("races").select("race_time").eq("meeting_id", todayMeetingId).not("race_time", "is", null).order("race_time");
        if (todayRaces && todayRaces.length > 0) {
          setFirstRaceDeadline(new Date(`${todayStr}T${todayRaces[0].race_time}:00`));
        }
      }

      if (g.type === "last_man_standing" && lmsData && lmsData.length > 0) {
        const { data: picksData } = await supabase.from("lms_picks").select("*").eq("competition_id", lmsData[0].id);
        setLmsPicks(picksData ?? []);
      }

      if (g.entry_fee_enabled && user.email) {
        setHasPaid((paymentsData ?? []).some((p: any) => p.user_email === user.email && p.status === "paid"));
      }

      setLoading(false);
    };
    load();
  }, [groupId]);

  const leaderboard = useMemo(() =>
    group ? getLeaderboard(group, entries, selectedMeetingId) : [],
    [group, entries, selectedMeetingId]
  );

  const groupStatus = useMemo(() =>
    group ? getGroupStatus(group, allMeetings) : "upcoming",
    [group, allMeetings]
  );

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
      <div className="w-6 h-6 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!group) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
      <p style={{ color: "var(--text-muted)" }}>Group not found.</p>
    </div>
  );

  const isOwner = currentUserEmail === group.owner_email;
  const isMember = (group.member_emails || []).includes(currentUserEmail ?? "");
  const statusCfg = STATUS_CONFIG[groupStatus];
  const currentMeeting = meetings.find(m => m.id === selectedMeetingId) || null;
  const availableMeetings = allMeetings.filter(m => !(group.meeting_ids || []).includes(m.id));
  const firstLmsComp = lmsCompetitions[0] || null;

  const formatAmount = (cents: number, currency: string) =>
    new Intl.NumberFormat("en-IE", { style: "currency", currency: (currency || "eur").toUpperCase() }).format(cents / 100);

  const handleShareLeaderboard = () => {
    const meetingName = currentMeeting ? currentMeeting.name : group.name;
    const medals = ["🥇", "🥈", "🥉"];
    const lines = leaderboard.map((entry, i) => {
      const medal = medals[i] || `${i + 1}.`;
      const name = entry.participantName || entry.email.split("@")[0];
      return `${medal} ${name} — ${entry.total}pts`;
    });
    const shareText = `🏇 ${meetingName} Leaderboard\n\n${lines.join("\n")}\n\n🏇 Derby Day`;
    if (navigator.share) navigator.share({ title: `${group.name} Leaderboard`, text: shareText }).catch(() => {});
    else { navigator.clipboard.writeText(shareText).catch(() => {}); toast.success("Copied to clipboard!"); }
  };

  const handleShareInvite = () => {
    const inviteUrl = `${window.location.origin}/join?code=${group.invite_code}&pin=${group.join_pin || ""}`;
    const emoji = group.type === "last_man_standing" ? "⚽" : "🏇";
    const shareText = `${emoji} You're invited to join "${group.name}" on Derby Day!\n\nLogin or create a free account to join 👇\n${inviteUrl}`;
    if (navigator.share) navigator.share({ title: `Join ${group.name}`, text: shareText }).catch(() => {});
    else { navigator.clipboard.writeText(shareText).catch(() => {}); toast.success("Invite copied!"); }
  };

  const addMeeting = async (meetingId: string) => {
    const updated = [...new Set([...(group.meeting_ids || []), meetingId])];
    await supabase.from("groups").update({ meeting_ids: updated }).eq("id", group.id);
    setGroup({ ...group, meeting_ids: updated });
    setMeetings(allMeetings.filter(m => updated.includes(m.id)));
    setShowAddMeeting(false);
    toast.success(`${allMeetings.find(m => m.id === meetingId)?.name || "Meeting"} added.`);
  };

  const removeMeeting = async (meetingId: string) => {
    const updated = (group.meeting_ids || []).filter(id => id !== meetingId);
    await supabase.from("groups").update({ meeting_ids: updated }).eq("id", group.id);
    setGroup({ ...group, meeting_ids: updated });
    setMeetings(allMeetings.filter(m => updated.includes(m.id)));
  };

  const handleLeaveGroup = async () => {
    if (!currentUserEmail) return;
    const updatedEmails = (group.member_emails || []).filter(e => e !== currentUserEmail);
    const updatedNames = { ...(group.member_names || {}) };
    delete updatedNames[currentUserEmail];
    await supabase.from("groups").update({ member_emails: updatedEmails, member_names: updatedNames }).eq("id", group.id);
    toast.success(`You have left ${group.name}.`);
    router.push("/");
  };

  const handleConfirmDelete = async () => {
    await supabase.from("entries").delete().eq("group_id", group.id);
    await supabase.from("groups").delete().eq("id", group.id);
    router.push("/");
  };

  const handleConfirmArchive = async () => {
    await supabase.from("groups").update({ status: "archived" }).eq("id", group.id);
    router.push("/");
  };

  const createLmsCompetition = async () => {
    if (!newLmsName.trim()) return;
    setCreatingLms(true);
    const { data: comp } = await supabase.from("lms_competitions").insert({
      group_id: group.id, name: newLmsName.trim(), status: "active", current_week: 1, weeks: [],
    }).select().single();
    if (comp) setLmsCompetitions([...lmsCompetitions, comp]);
    setNewLmsName(""); setShowCreateLms(false); setCreatingLms(false);
  };

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayMeeting = meetings.find(m => m.date === todayStr);

  const tabs = [
    { id: "leaderboard", label: "Leaderboard" },
    ...(group.type === "horse_racing" && isMember ? [{ id: "mypicks", label: "📋 My Picks" }] : []),
    ...(group.type === "last_man_standing" ? [{ id: "lms", label: "⚔️ Pick Team" }] : []),
    ...(isOwner ? [{ id: "members", label: "Members" }] : []),
  ];

  const renderLmsStandings = () => {
    const comp = lmsCompetitions[0];
    const memberEmails = group.member_emails || [];
    const participants = memberEmails.map(email => {
      const memberPicks = lmsPicks.filter(p => p.user_email === email);
      const isEliminated = memberPicks.some(p => p.result === "eliminated");
      const eliminatedPick = memberPicks.find(p => p.result === "eliminated");
      const currentWeekPick = comp ? memberPicks.find(p => p.week_number === comp.current_week) : null;
      const weeksAlive = isEliminated ? (eliminatedPick ? eliminatedPick.week_number - 1 : 0) : memberPicks.filter(p => p.result === "win").length;
      return {
        email, name: (group.member_names || {})[email] || email.split("@")[0],
        status: isEliminated ? "eliminated" : "alive", weeksAlive,
        eliminatedWeek: eliminatedPick?.week_number, currentPick: currentWeekPick?.team,
      };
    });
    const alive = participants.filter(p => p.status === "alive").sort((a, b) => b.weeksAlive - a.weeksAlive);
    const eliminated = participants.filter(p => p.status === "eliminated").sort((a, b) => b.weeksAlive - a.weeksAlive);
    return (
      <div className="rounded-2xl border overflow-hidden" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
        {comp && (
          <div className="px-5 py-3 border-b flex items-center" style={{ borderColor: "var(--border)", background: "rgba(168,85,247,0.05)" }}>
            <Swords className="w-4 h-4 text-purple-500 mr-2" />
            <span className="text-xs font-semibold text-purple-600 uppercase tracking-wide">{comp.name} · Week {comp.current_week}</span>
          </div>
        )}
        {alive.length > 0 && (
          <>
            <div className="px-5 py-2 border-b flex items-center gap-2" style={{ borderColor: "var(--border)" }}>
              <Trophy className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-xs font-semibold text-purple-500 uppercase tracking-wide">Still In ({alive.length})</span>
            </div>
            {alive.map((p, i) => (
              <div key={p.email} className={`flex items-center justify-between px-5 py-3 border-b ${p.email === currentUserEmail ? "bg-purple-50" : ""}`} style={{ borderColor: "var(--border)" }}>
                <div className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${i === 0 ? "bg-amber-100 text-amber-600" : i === 1 ? "bg-slate-100 text-slate-500" : "bg-slate-50 text-slate-400"}`}>{i + 1}</span>
                  <div>
                    <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{p.name}{p.email === currentUserEmail && <span className="ml-1 text-xs text-purple-500">(you)</span>}</p>
                    {p.currentPick ? <p className="text-xs" style={{ color: "var(--text-muted)" }}>This week: {p.currentPick}</p> : <p className="text-xs text-amber-500">⚠ No pick yet</p>}
                  </div>
                </div>
                <span className="text-sm font-bold text-purple-600">{p.weeksAlive}w</span>
              </div>
            ))}
          </>
        )}
        {eliminated.length > 0 && (
          <>
            <div className="px-5 py-2 border-b border-t flex items-center gap-2" style={{ borderColor: "var(--border)", background: "rgba(239,68,68,0.04)" }}>
              <X className="w-3.5 h-3.5 text-red-400" />
              <span className="text-xs font-semibold text-red-400 uppercase tracking-wide">Eliminated ({eliminated.length})</span>
            </div>
            {eliminated.map(p => (
              <div key={p.email} className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: "var(--border)" }}>
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 bg-red-50"><X className="w-3 h-3 text-red-400" /></span>
                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{p.name}{p.email === currentUserEmail && <span className="ml-1 text-xs text-red-400">(you)</span>}</p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-slate-400">{p.weeksAlive}w</span>
                  {p.eliminatedWeek && <p className="text-xs text-red-400">Out wk {p.eliminatedWeek}</p>}
                </div>
              </div>
            ))}
          </>
        )}
        {alive.length === 0 && eliminated.length === 0 && (
          <div className="px-5 py-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>No participants yet.</div>
        )}
      </div>
    );
  };

  const renderDeadlineBanner = () => {
    if (!firstRaceDeadline || !isMember || group.type !== "horse_racing") return null;
    const msUntil = firstRaceDeadline.getTime() - now.getTime();
    if (msUntil <= 0) return null;
    const todayEntry = (group.daily_meeting_ids || []).find((d: any) => d.date === todayStr);
    const fallbackMeeting = !todayEntry ? meetings.find(m => m.date === todayStr) : null;
    const todayMeetingEntry = todayEntry || (fallbackMeeting ? { meeting_id: fallbackMeeting.id } : null);
    if (!todayMeetingEntry) return null;
    const hasEntry = entries.some(e => e.meeting_id === todayMeetingEntry.meeting_id && e.user_email === currentUserEmail && e.submitted);
    if (hasEntry) return null;
    const totalMins = Math.floor(msUntil / 60000);
    const hoursLeft = Math.floor(totalMins / 60);
    const minsLeft = totalMins % 60;
    const timeStr = hoursLeft > 0 ? `${hoursLeft}h ${minsLeft}m` : `${minsLeft}m`;
    return (
      <div className="rounded-2xl p-4 border-2 border-red-400 bg-red-50 flex items-start gap-3 mb-4">
        <span className="text-red-500 text-lg flex-shrink-0">⚠️</span>
        <div className="flex-1">
          <p className="text-sm font-bold text-red-700">Deadline approaching — you haven&apos;t picked yet today!</p>
          <p className="text-sm text-red-600 mt-0.5"><strong>{timeStr}</strong> remaining.</p>
        </div>
        <Link href={`/enter-tips?meetingId=${todayMeetingEntry.meeting_id}&groupId=${group.id}`}
          className="flex-shrink-0 px-3 py-2 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 whitespace-nowrap">
          Pick Now →
        </Link>
      </div>
    );
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <div className="max-w-2xl mx-auto px-4 pb-24">

        {/* Hero Header */}
        <div className="rounded-b-3xl px-6 pt-6 pb-6 mb-5 -mx-4"
          style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f4c2a 100%)" }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold tracking-widest text-green-400 uppercase">
                {group.type === "last_man_standing" ? "⚽ Football" : "🏇 Horse Racing"}
              </span>
            </div>
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${statusCfg.bg} ${statusCfg.color} ${statusCfg.border}`}>
              <statusCfg.Icon className="w-3.5 h-3.5" />
              {statusCfg.label}
            </span>
          </div>

          <h1 className="text-3xl font-black text-white mb-3 leading-tight">{group.name}</h1>

          <div className="flex items-center gap-3 flex-wrap mb-4">
            <span className="text-sm text-white/60">
              👥 {(group.member_emails || []).length} member{(group.member_emails || []).length !== 1 ? "s" : ""}
            </span>
            <span className="text-white/30">·</span>
            <span className="text-sm text-white/60">
              Code: <span className="font-mono font-bold text-green-400">{group.invite_code}</span>
            </span>
          </div>

          <div className="flex gap-2 flex-wrap">
            {isOwner && (
              <button onClick={handleShareInvite}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all active:scale-95"
                style={{ background: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)" }}>
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white flex-shrink-0"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.125.558 4.116 1.529 5.845L.057 23.882l6.235-1.634A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.006-1.371l-.359-.214-3.701.97.988-3.61-.234-.37A9.818 9.818 0 0112 2.182c5.42 0 9.818 4.398 9.818 9.818 0 5.421-4.398 9.818-9.818 9.818z"/></svg>
                Share Invite
              </button>
            )}

            {group.type === "horse_racing" && todayMeeting && (
              <Link href={`/enter-tips?meetingId=${todayMeeting.id}&groupId=${group.id}`}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white active:scale-95 transition-all"
                style={{ background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)" }}>
                🐴 Select Horses
              </Link>
            )}
          </div>

          {(isOwner || isAdmin) && (
            <button onClick={() => setShowDeleteModal(true)} className="mt-3 flex items-center gap-1.5 text-xs font-medium text-white/30 hover:text-white/60 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
              {groupStatus === "completed" ? "Delete group" : "Archive or delete group"}
            </button>
          )}
          {isMember && !isOwner && (
            <button onClick={() => setShowLeaveConfirm(true)} className="mt-3 flex items-center gap-1.5 text-xs font-medium text-white/30 hover:text-white/60 transition-colors">
              <X className="w-3.5 h-3.5" /> Leave group
            </button>
          )}
        </div>

        {group.entry_fee_enabled && !hasPaid && (
          <div className="mb-5 rounded-2xl p-5 border-2 border-green-300 bg-green-50">
            <div className="flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-green-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-green-800">Entry fee required</p>
                <p className="text-sm text-green-600">Pay {formatAmount(group.entry_fee, group.currency)} to participate.</p>
              </div>
            </div>
          </div>
        )}

        {group.type === "horse_racing" && isMember && firstRaceDeadline && now > firstRaceDeadline && (() => {
          const dailyEntry = (group.daily_meeting_ids || []).find((d: any) => d.date === todayStr);
          const fallbackMeeting = !dailyEntry ? meetings.find(m => m.date === todayStr) : null;
          const todayEntry = dailyEntry || (fallbackMeeting ? { meeting_id: fallbackMeeting.id } : null);
          if (!todayEntry) return null;
          const hasEntry = entries.some(e => e.meeting_id === todayEntry.meeting_id && e.user_email === currentUserEmail && e.submitted);
          if (hasEntry) return null;
          return (
            <div className="mb-5 rounded-2xl p-4 border-2 border-red-200 bg-red-50 flex items-start gap-3">
              <span className="text-red-500 text-lg flex-shrink-0">⚠️</span>
              <p className="text-sm text-red-700"><strong>You missed today&apos;s deadline</strong> — 0 points recorded.</p>
            </div>
          );
        })()}

        <div className="flex gap-1 mb-5 rounded-xl p-1" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => {
              if (tab.id === "lms" && firstLmsComp) { router.push(`/lms/${firstLmsComp.id}?groupId=${group.id}&tab=pick`); return; }
              setActiveTab(tab.id);
            }}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${activeTab === tab.id ? "bg-green-500 text-white" : ""}`}
              style={activeTab !== tab.id ? { color: "var(--text-muted)" } : {}}>
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "leaderboard" && (
          <div className="space-y-4">
            {renderDeadlineBanner()}
            {group.type === "last_man_standing" ? renderLmsStandings() : (
              <>
                {!isMember && !isOwner && !isAdmin && (
                  <div className="rounded-2xl border-2 border-green-300 bg-green-50 px-5 py-4 flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-green-800">Join this group to see full player names and submit your picks.</p>
                    <Link href={`/join?code=${group.invite_code}&pin=${group.join_pin || ""}`}
                      className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-green-600 hover:bg-green-700 whitespace-nowrap">Join</Link>
                  </div>
                )}
                {group.type === "horse_racing" && groupStatus === "completed" && leaderboard.length > 0 && (
                  <div className="rounded-2xl border-2 border-amber-400 bg-amber-50 px-5 py-4 flex items-center gap-3">
                    <span className="text-3xl flex-shrink-0">🏆</span>
                    <div className="flex-1">
                      <p className="font-bold text-amber-800 text-base">
                        {(group.member_names || {})[leaderboard[0].email] || leaderboard[0].participantName || leaderboard[0].email.split("@")[0]} wins with {leaderboard[0].total} points!
                      </p>
                      <p className="text-xs text-amber-600 mt-0.5">Competition complete</p>
                    </div>
                  </div>
                )}
                {isOwner && groupStatus === "completed" && group.status !== "finalised" && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Finalise Competition</p>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>Lock results and mark this competition as complete.</p>
                    </div>
                    <button onClick={async () => {
                      setFinalising(true);
                      await supabase.from("groups").update({ status: "finalised" }).eq("id", group.id);
                      setGroup(g => g ? { ...g, status: "finalised" as any } : g);
                      setFinalised(true); setFinalising(false);
                    }} disabled={finalising}
                      className="bg-slate-800 hover:bg-slate-700 text-white rounded-xl px-4 py-2 text-sm font-semibold whitespace-nowrap flex-shrink-0">
                      {finalising ? "Finalising..." : "Finalise"}
                    </button>
                  </div>
                )}
                {(finalised || group.status === "finalised") && (
                  <div className="rounded-2xl border border-green-200 bg-green-50 px-5 py-3 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <p className="text-sm font-semibold text-green-700">Competition finalised! Results are now locked.</p>
                  </div>
                )}
                {meetings.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    <button onClick={() => setSelectedMeetingId(null)}
                      className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap ${selectedMeetingId === null ? "bg-green-500 text-white" : "bg-white border"}`}
                      style={selectedMeetingId !== null ? { background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-muted)" } : {}}>
                      Overall
                    </button>
                    {meetings.map(m => (
                      <button key={m.id} onClick={() => setSelectedMeetingId(m.id)}
                        className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap ${selectedMeetingId === m.id ? "bg-green-500 text-white" : "bg-white border"}`}
                        style={selectedMeetingId !== m.id ? { background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-muted)" } : {}}>
                        {m.name}
                      </button>
                    ))}
                  </div>
                )}
                {(isOwner || isAdmin) && leaderboard.length > 0 && (
                  <button onClick={handleShareLeaderboard}
                    className="w-full py-3 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2"
                    style={{ background: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)" }}>
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.125.558 4.116 1.529 5.845L.057 23.882l6.235-1.634A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.006-1.371l-.359-.214-3.701.97.988-3.61-.234-.37A9.818 9.818 0 0112 2.182c5.42 0 9.818 4.398 9.818 9.818 0 5.421-4.398 9.818-9.818 9.818z"/></svg>
                    Share Leaderboard
                  </button>
                )}
                <div className="rounded-2xl border overflow-hidden" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
                  <div className="px-5 py-4 border-b flex items-center gap-2" style={{ borderColor: "var(--border)" }}>
                    <Trophy className="w-4 h-4 text-amber-500" />
                    <h2 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                      {currentMeeting ? `${currentMeeting.name} Leaderboard` : "Overall Leaderboard"}
                    </h2>
                  </div>
                  {leaderboard.length === 0 ? (
                    <div className="px-5 py-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>No entries yet.</div>
                  ) : (
                    <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                      {leaderboard.map((row, i) => (
                        <div key={row.email} className={`flex items-center justify-between px-5 py-3 ${row.email === currentUserEmail ? "bg-green-50" : ""}`}>
                          <div className="flex items-center gap-3">
                            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0
  ${i === 0 ? "bg-amber-400 text-white" : i === 1 ? "bg-slate-300 text-white" : i === 2 ? "bg-orange-300 text-white" : "bg-slate-100 text-slate-400"}`}>
  {i + 1}
</span>
                            <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                              {(isMember || isOwner || isAdmin) ? ((group.member_names || {})[row.email] || row.participantName || row.email.split("@")[0]) : `Player ${i + 1}`}
                              {row.email === currentUserEmail && <span className="ml-1 text-xs text-green-500 font-semibold">(you)</span>}
                            </span>
                          </div>
                          <span className="font-black text-base text-green-600">{row.total} pts</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === "meetings" && (
          <div className="space-y-4">
            <div className="rounded-2xl border overflow-hidden" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
              <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-green-500" />
                  <h2 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Meetings</h2>
                </div>
                {(isOwner || isAdmin) && (
                  <button onClick={() => setShowAddMeeting(!showAddMeeting)} className="flex items-center gap-1 text-xs font-semibold text-green-500 hover:text-green-600">
                    <Plus className="w-3.5 h-3.5" /> Add
                  </button>
                )}
              </div>
              {showAddMeeting && (
                <div className="px-5 py-3 border-b space-y-2" style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
                  {availableMeetings.length === 0 ? (
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>All available meetings have been added.</p>
                  ) : (
                    <>
                      <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Select a meeting to add:</p>
                      {availableMeetings.map(m => (
                        <button key={m.id} onClick={() => addMeeting(m.id)}
                          className="w-full text-left px-3 py-2 rounded-xl hover:bg-green-50 text-sm transition-colors" style={{ color: "var(--text-primary)" }}>
                          {m.name} <span className="text-xs ml-1" style={{ color: "var(--text-muted)" }}>· {format(new Date(m.date), "d MMM yyyy")}</span>
                        </button>
                      ))}
                    </>
                  )}
                </div>
              )}
              {meetings.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>
                  {(isOwner || isAdmin) ? "No meetings added yet. Click Add to include a meeting." : "No meetings selected for this group yet."}
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                  {meetings.map(m => (
                    <div key={m.id} className="flex items-center justify-between px-5 py-3">
                      <Link href={`/enter-tips?meetingId=${m.id}&groupId=${group.id}`} className="flex-1">
                        <p className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>{m.name}</p>
                        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{format(new Date(m.date), "d MMM yyyy")}</p>
                        {(raceCounts[m.id] || 0) > 0 ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 mt-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
                            ✅ {raceCounts[m.id]} race{raceCounts[m.id] !== 1 ? "s" : ""} available
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 mt-1 rounded-full bg-amber-50 text-amber-600 border border-amber-200">
                            ⏳ Races not yet available
                          </span>
                        )}
                      </Link>
                      <div className="flex items-center gap-2">
                        <Link href={`/enter-tips?meetingId=${m.id}&groupId=${group.id}`}>
                          <ChevronRight className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
                        </Link>
                        {(isOwner || isAdmin) && (
                          <button onClick={() => removeMeeting(m.id)} className="w-6 h-6 flex items-center justify-center text-slate-300 hover:text-red-400 transition-colors">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "lms" && (
          <div className="space-y-4">
            <div className="rounded-2xl border overflow-hidden" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
              <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
                <div className="flex items-center gap-2">
                  <Swords className="w-4 h-4 text-purple-500" />
                  <h2 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Last Man Standing</h2>
                </div>
                {isOwner && (
                  <button onClick={() => setShowCreateLms(!showCreateLms)} className="flex items-center gap-1 text-xs font-semibold text-purple-500 hover:text-purple-600">
                    <Plus className="w-3.5 h-3.5" /> New
                  </button>
                )}
              </div>
              {showCreateLms && (
                <div className="px-5 py-4 border-b space-y-3" style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
                  <input placeholder="Competition name e.g. Season 2025" value={newLmsName} onChange={e => setNewLmsName(e.target.value)}
                    className="w-full h-10 rounded-xl border px-3 text-sm" style={{ borderColor: "var(--border)" }} />
                  <div className="flex gap-2">
                    <button onClick={createLmsCompetition} disabled={!newLmsName.trim() || creatingLms}
                      className="flex-1 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold disabled:opacity-50">
                      {creatingLms ? "Creating..." : "Create Competition"}
                    </button>
                    <button onClick={() => setShowCreateLms(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600">Cancel</button>
                  </div>
                </div>
              )}
              {lmsCompetitions.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>
                  {isOwner ? "No LMS competitions yet. Create one above!" : "No Last Man Standing competitions yet."}
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                  {lmsCompetitions.map(comp => (
                    <div key={comp.id} className="flex items-center justify-between px-5 py-4 gap-3">
                      <Link href={`/lms/${comp.id}?groupId=${group.id}`}
                        className="flex items-center justify-between flex-1 hover:bg-purple-50 transition-colors rounded-xl -mx-2 px-2 py-1">
                        <div>
                          <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{comp.name}</p>
                          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Week {comp.current_week} · {comp.status}</p>
                        </div>
                        <ChevronRight className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
                      </Link>
                      {isAdmin && (
                        <Link href={`/admin/lms-results?competitionId=${comp.id}&groupId=${group.id}`}
                          className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white whitespace-nowrap">
                          Enter Results →
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "members" && isOwner && (
          <GroupMembersTab group={group} payments={payments} currentUserEmail={currentUserEmail} onGroupUpdate={u => setGroup(g => g ? { ...g, ...u } : g)} />
        )}

        {activeTab === "mypicks" && (
          <div className="rounded-2xl border overflow-hidden" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
            <div className="px-5 py-4 border-b flex items-center gap-2" style={{ borderColor: "var(--border)" }}>
              <Trophy className="w-4 h-4 text-amber-500" />
              <h2 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>My Picks</h2>
            </div>
            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              {entries.filter(e => e.user_email === currentUserEmail).length === 0 ? (
                <div className="px-5 py-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>No picks submitted yet.</div>
              ) : (
                entries.filter(e => e.user_email === currentUserEmail).map(entry => {
                  const meeting = meetings.find(m => m.id === entry.meeting_id);
                  return (
                    <div key={entry.id} className="px-5 py-4">
                      <p className="font-semibold text-sm mb-2" style={{ color: "var(--text-primary)" }}>{meeting?.name || "Meeting"}</p>
                      <div className="space-y-1">
                        {(entry.selections || []).map((sel: any) => (
                          <div key={sel.race_id} className="flex items-center justify-between text-xs">
                            <span style={{ color: "var(--text-muted)" }}>Race {sel.race_number}</span>
                            <span className="font-medium" style={{ color: "var(--text-primary)" }}>
                              {sel.horse_name}
                              {sel.is_best_chance && <span className="ml-1 text-amber-500">★</span>}
                            </span>
                          </div>
                        ))}
                      </div>
                      {entry.total_points > 0 && (
                        <p className="text-xs font-bold text-green-600 mt-2">{entry.total_points} pts</p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        <div className="text-center px-4 py-3 text-xs rounded-2xl mt-5" style={{ color: "var(--text-muted)", background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          For entertainment only · 18+ ·{" "}
          <a href="https://www.begambleaware.org" target="_blank" rel="noopener noreferrer" className="underline hover:opacity-70">begambleaware.org</a>
        </div>
      </div>

      {showLeaveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="rounded-2xl p-6 max-w-sm w-full shadow-xl" style={{ background: "var(--bg-card)" }}>
            <h3 className="font-bold text-lg mb-2" style={{ color: "var(--text-primary)" }}>Leave group?</h3>
            <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
              Are you sure you want to leave <strong>{group.name}</strong>? You&apos;ll need an invite code to rejoin.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowLeaveConfirm(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600">Cancel</button>
              <button onClick={handleLeaveGroup} className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold">Leave</button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <DeleteGroupModal group={group} status={groupStatus} onConfirmDelete={handleConfirmDelete} onConfirmArchive={handleConfirmArchive} onClose={() => setShowDeleteModal(false)} />
      )}
    </div>
  );
}
