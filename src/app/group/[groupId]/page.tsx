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
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }}>
      <div className="w-full max-w-sm rounded-3xl p-6 space-y-4 bg-white text-slate-900 max-h-[85vh] overflow-y-auto">
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
      <div className="rounded-3xl border overflow-hidden" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
        <div className="px-6 py-5 border-b flex items-center gap-2" style={{ borderColor: "var(--border)" }}>
          <Users className="w-5 h-5 text-green-500" />
          <h2 className="font-semibold text-base" style={{ color: "var(--text-primary)" }}>Members ({members.length}/{group.max_players || 20})</h2>
        </div>
        {members.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm" style={{ color: "var(--text-muted)" }}>No members yet.</div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {members.map(email => {
              const name = memberNames[email] || email.split("@")[0];
              const isOwner = email === group.owner_email;
              const hasPaid = group.entry_fee_enabled ? paidEmails.has(email) : null;
              const isMe = email === currentUserEmail;
              return (
                <div key={email} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-slate-500">{name.charAt(0).toUpperCase()}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-base font-medium" style={{ color: "var(--text-primary)" }}>{name}</p>
                          {isOwner && <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">Owner</span>}
                          {isMe && !isOwner && <span className="text-xs text-green-500 font-semibold">(you)</span>}
                          {hasPaid === true && <span className="text-xs px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold">Paid</span>}
                          {hasPaid === false && <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-50 text-red-500 font-semibold">Unpaid</span>}
                        </div>
                        <p className="text-sm text-slate-400">{email}</p>
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
                          <UserMinus className="w-5 h-5" />
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
