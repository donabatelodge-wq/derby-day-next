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
      supabase.rpc("preview_group_by_invite_code", { p_invite_code: joinCode })
        .then(({ data }) => setPreviewGroup(data?.[0] ?? null));
    } else {
      setPreviewGroup(null);
    }
  }, [joinCode]);

  const handleJoin = async () => {
    if (!joinCode.trim() || !joinName.trim() || joinPin.length !== 4) return;
    setJoining(true);
    setJoinError("");

    // join_group() validates the PIN and capacity server-side and only ever
    // touches member_emails/member_names — nothing about the group can be
    // read or altered beyond that through this call.
    const { data, error } = await supabase.rpc("join_group", {
      p_invite_code: joinCode.trim(),
      p_pin: joinPin.trim(),
      p_display_name: joinName.trim(),
    });

    if (error || !data?.group) {
      setJoinError(error?.message || "Failed to join. Please try again.");
      setJoining(false);
      return;
    }

    if (data.already_member) {
      toast.info("You're already a member of this group!");
    } else {
      toast.success(`Welcome to ${data.group.name}!`);
    }

    setJoining(false);
    router.push(`/group/${data.group.id}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-5"
      style={{
        background: "var(--bg)",
        paddingTop: "calc(1.5rem + var(--safe-top, 0px))",
        paddingBottom: "calc(1.5rem + var(--safe-bottom, 0px))",
      }}>
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl">🎯</div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Join a Competition</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Enter the invite code and PIN from the group owner</p>
        </div>

        {previewGroup && (
          <div className="mb-5 rounded-2xl border-2 border-green-300 bg-green-50 px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{previewGroup.type === "last_man_standing" ? "⚽" : "🏇"}</span>
              <div>
                <p className="font-bold text-green-900">{previewGroup.name}</p>
                <p className="text-xs text-green-600">
                  {previewGroup.member_count}/{previewGroup.max_players || 20} players joined
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Your display name</label>
            <input placeholder="How your name appears on the leaderboard" value={joinName} onChange={e => setJoinName(e.target.value)}
              className="w-full h-14 rounded-2xl border px-4 text-base focus:outline-none focus:ring-2 focus:ring-green-400"
              style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-primary)" }} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Invite code</label>
            <input placeholder="e.g. A1234" value={joinCode} onChange={e => { setJoinCode(e.target.value.toUpperCase()); setJoinError(""); }}
              maxLength={6}
              className="w-full h-14 rounded-2xl border px-4 text-base font-mono uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-green-400"
              style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-primary)" }} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>PIN</label>
            <input placeholder="4-digit PIN" value={joinPin} onChange={e => setJoinPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              maxLength={4} inputMode="numeric"
              className="w-full h-14 rounded-2xl border px-4 text-base font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-green-400"
              style={{ background: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-primary)" }} />
          </div>

          {joinError && (
            <div className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {joinError}
            </div>
          )}

          <button onClick={handleJoin}
            disabled={!joinCode.trim() || !joinName.trim() || joinPin.length !== 4 || joining}
            className="w-full h-14 rounded-2xl bg-green-500 hover:bg-green-600 text-white font-bold text-base disabled:opacity-50 transition-all active:scale-95">
            {joining ? "Joining..." : "Join Competition"}
          </button>

          <div className="flex items-center gap-3 py-2">
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>or</span>
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
          </div>

          <button onClick={() => router.push("/group/new")}
            className="w-full h-14 rounded-2xl border-2 font-bold text-base transition-colors flex items-center justify-center gap-2 active:scale-95"
            style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}>
            <Users className="w-4 h-4" /> Create your own competition
          </button>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: "var(--text-muted)" }}>
          Signed in as <span className="font-medium">{userEmail}</span>
        </p>
      </div>
    </div>
  );
}
