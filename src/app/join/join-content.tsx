"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Users } from "lucide-react";
import { toast } from "sonner";

export default function JoinContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();

  const [userEmail, setUserEmail] = useState("");
  const [joinCode, setJoinCode] = useState(searchParams.get("code") || "");
  const [joinPin, setJoinPin] = useState(searchParams.get("pin") || "");
  const [joinName, setJoinName] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [previewGroup, setPreviewGroup] = useState<any>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push(`/login?next=/join?code=${joinCode}&pin=${joinPin}`); return; }
      setUserEmail(user.email ?? "");

      const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
      if (profile?.full_name) setJoinName(profile.full_name);

      if (!joinCode && typeof window !== "undefined") {
        const pendingCode = localStorage.getItem("pendingInviteCode");
        const pendingPin = localStorage.getItem("pendingInvitePin");
        if (pendingCode) {
          setJoinCode(pendingCode);
          setJoinPin(pendingPin || "");
          localStorage.removeItem("pendingInviteCode");
          localStorage.removeItem("pendingInvitePin");
        }
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (joinCode.length >= 5) {
      supabase.from("groups").select("id, name, type, member_emails, max_players")
        .eq("invite_code", joinCode.toUpperCase())
        .single()
        .then(({ data }) => setPreviewGroup(data ?? null));
    } else {
      setPreviewGroup(null);
    }
  }, [joinCode]);

  const handleJoin = async () => {
    if (!joinCode.trim() || !joinName.trim() || joinPin.length !== 4) return;
    setJoining(true);
    setJoinError("");

    const { data: groups } = await supabase.from("groups").select("*").eq("invite_code", joinCode.trim().toUpperCase());
    const group = groups?.[0];

    if (!group) { setJoinError("Invalid invite code."); setJoining(false); return; }
    if (group.join_pin && group.join_pin !== joinPin.trim()) { setJoinError("Incorrect PIN."); setJoining(false); return; }

    const already = (group.member_emails || []).includes(userEmail);
    if (!already && group.max_players && (group.member_emails || []).length >= group.max_players) {
      setJoinError("This group is full — the maximum number of players has been reached.");
      setJoining(false);
      return;
    }

    if (!already) {
      const { error } = await supabase.from("groups").update({
        member_emails: [...(group.member_emails || []), userEmail],
        member_names: { ...(group.member_names || {}), [userEmail]: joinName.trim() },
      }).eq("id", group.id);

      if (error) { setJoinError("Failed to join. Please try again."); setJoining(false); return; }
      toast.success(`Welcome to ${group.name}!`);
    } else {
      toast.info("You're already a member of this group!");
    }

    setJoining(false);
    router.push(`/group/${group.id}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--bg)" }}>
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl">🎯</div>
          <h1 className="text-2xl font-bold text-slate-900">Join a Competition</h1>
          <p className="text-sm text-slate-500 mt-1">Enter the invite code and PIN from the group owner</p>
        </div>

        {previewGroup && (
          <div className="mb-5 rounded-2xl border-2 border-green-300 bg-green-50 px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{previewGroup.type === "last_man_standing" ? "⚽" : "🏇"}</span>
              <div>
                <p className="font-bold text-green-900">{previewGroup.name}</p>
                <p className="text-xs text-green-600">
                  {(previewGroup.member_emails || []).length}/{previewGroup.max_players || 20} players joined
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Your display name</label>
            <input placeholder="How your name appears on the leaderboard" value={joinName} onChange={e => setJoinName(e.target.value)}
              className="w-full h-11 rounded-xl border border-slate-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Invite code</label>
            <input placeholder="e.g. A1234" value={joinCode} onChange={e => { setJoinCode(e.target.value.toUpperCase()); setJoinError(""); }}
              maxLength={6} className="w-full h-11 rounded-xl border border-slate-200 px-4 text-sm font-mono uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-green-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">PIN</label>
            <input placeholder="4-digit PIN" value={joinPin} onChange={e => setJoinPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              maxLength={4} inputMode="numeric"
              className="w-full h-11 rounded-xl border border-slate-200 px-4 text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-green-400" />
          </div>

          {joinError && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {joinError}
            </div>
          )}

          <button onClick={handleJoin}
            disabled={!joinCode.trim() || !joinName.trim() || joinPin.length !== 4 || joining}
            className="w-full h-12 rounded-xl bg-green-500 hover:bg-green-600 text-white font-semibold text-sm disabled:opacity-50 transition-colors">
            {joining ? "Joining..." : "Join Competition"}
          </button>

          <div className="flex items-center gap-3 py-2">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs text-slate-400">or</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          <button onClick={() => router.push("/group/new")}
            className="w-full h-12 rounded-xl border-2 border-slate-200 text-slate-700 font-semibold text-sm hover:border-green-300 transition-colors flex items-center justify-center gap-2">
            <Users className="w-4 h-4" /> Create your own competition
          </button>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Signed in as <span className="font-medium">{userEmail}</span>
        </p>
      </div>
    </div>
  );
}
