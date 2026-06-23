"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";

export default function InviteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();
  const code = searchParams.get("code") || "";
  const pin = searchParams.get("pin") || "";

  const [group, setGroup] = useState<any>(null);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (typeof window !== "undefined") {
          localStorage.setItem("pendingInviteCode", code);
          localStorage.setItem("pendingInvitePin", pin);
        }
        router.push(`/login?next=/invite?code=${code}&pin=${pin}`);
        return;
      }
      if (!code) { setNotFound(true); setLoading(false); return; }

      const { data: groups } = await supabase.from("groups").select("*").eq("invite_code", code.toUpperCase());
      if (!groups || groups.length === 0) { setNotFound(true); setLoading(false); return; }

      const g = groups[0];
      setGroup(g);

      if ((g.meeting_ids || []).length > 0) {
        const { data: allMeetings } = await supabase.from("meetings").select("*").in("id", g.meeting_ids).order("date");
        setMeetings(allMeetings ?? []);
      }
      setLoading(false);
    };
    load();
  }, [code]);

  const handleJoin = () => {
    router.push(`/join?code=${code}&pin=${pin}`);
  };

  if (loading) return (
    <div className="fixed inset-0 flex items-center justify-center"
      style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%)" }}>
      <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (notFound || !group) return (
    <div className="fixed inset-0 flex flex-col items-center justify-center px-8 text-center gap-6"
      style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%)" }}>
      <span className="text-6xl">🔍</span>
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Link Not Found</h2>
        <p className="text-slate-300 text-sm">This competition invite link has expired or is invalid.</p>
      </div>
      <button onClick={() => router.push("/")}
        className="px-6 py-3 rounded-2xl text-sm font-semibold text-white border border-white/30 hover:bg-white/10 transition-colors">
        ← Go Home
      </button>
      <p className="text-white/30 text-xs mt-8">Powered by Derby Day 🏇</p>
    </div>
  );

  const isLms = group.type === "last_man_standing";
  const playerCount = (group.member_emails || []).length;
  const firstMeetingDate = meetings.length > 0
    ? (() => { try { return format(new Date(meetings[0].date), "EEE d MMM"); } catch { return "TBC"; } })()
    : "TBC";
  const deadlineFormatted = group?.start_deadline
    ? (() => { try { return format(new Date(group.start_deadline), "EEE d MMM, HH:mm"); } catch { return "Open"; } })()
    : "Open";

  return (
    <div className="fixed inset-0 overflow-y-auto flex flex-col items-center"
      style={{
        background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%)",
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}>
      <div className="w-full max-w-sm px-5 py-10 flex flex-col items-center gap-6">

        <div className="w-24 h-24 rounded-full flex items-center justify-center text-5xl"
          style={{ border: "3px solid #f59e0b", background: "rgba(245,158,11,0.1)" }}>
          🏇
        </div>

        <div className="text-center">
          <p className="text-white/60 text-xs uppercase tracking-widest font-semibold mb-1">You&apos;re Invited To</p>
          <h1 className="text-3xl font-black text-white leading-tight">{group.name}</h1>
        </div>

        <div className="px-4 py-1.5 rounded-full text-sm font-bold"
          style={isLms
            ? { background: "rgba(168,85,247,0.2)", color: "#c084fc", border: "1px solid rgba(168,85,247,0.4)" }
            : { background: "rgba(34,197,94,0.15)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.35)" }
          }>
          {isLms ? "⚽ Football Competition" : "🏇 Racing Competition"}
        </div>

        <div className="grid grid-cols-2 gap-3 w-full">
          <div className="rounded-2xl p-4 flex flex-col gap-1"
            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}>
            <span className="text-lg">📅</span>
            <p className="text-white/50 text-xs font-semibold uppercase tracking-wide">Meetings</p>
            <p className="text-white font-bold text-lg">{meetings.length}</p>
            <div className="text-white/40 text-xs leading-relaxed">
              {meetings.slice(0, 3).map(m => <p key={m.id} className="truncate">{m.name}</p>)}
              {meetings.length > 3 && <p>+{meetings.length - 3} more</p>}
              {meetings.length === 0 && <p>TBC</p>}
            </div>
          </div>
          <div className="rounded-2xl p-4 flex flex-col gap-1"
            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}>
            <span className="text-lg">👥</span>
            <p className="text-white/50 text-xs font-semibold uppercase tracking-wide">Players</p>
            <p className="text-white font-bold text-lg">{playerCount}</p>
            <p className="text-white/40 text-xs">{playerCount} joined</p>
          </div>
          <div className="rounded-2xl p-4 flex flex-col gap-1"
            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}>
            <span className="text-lg">🗓️</span>
            <p className="text-white/50 text-xs font-semibold uppercase tracking-wide">First Race</p>
            <p className="text-white font-bold text-base leading-tight">{firstMeetingDate}</p>
          </div>
          <div className="rounded-2xl p-4 flex flex-col gap-1"
            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}>
            <span className="text-lg">⏰</span>
            <p className="text-white/50 text-xs font-semibold uppercase tracking-wide">Deadline</p>
            <p className="text-white font-bold text-base leading-tight">{deadlineFormatted}</p>
          </div>
        </div>

        {group.prize_description && (
          <div className="w-full rounded-2xl px-4 py-3 text-center"
            style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)" }}>
            <p className="text-amber-300 text-sm font-medium">🏆 {group.prize_description}</p>
          </div>
        )}

        <button onClick={handleJoin}
          className="w-full py-4 rounded-2xl text-lg font-black text-white transition-transform active:scale-95 join-pulse">
          🎯 Join This Competition
        </button>

        <p className="text-white/25 text-xs">Powered by Derby Day 🏇</p>
      </div>

      <style>{`
        .join-pulse {
          background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
          box-shadow: 0 0 30px rgba(34,197,94,0.4);
          animation: joinPulse 2s infinite;
        }
        @keyframes joinPulse {
          0%, 100% { box-shadow: 0 0 30px rgba(34,197,94,0.4); }
          50% { box-shadow: 0 0 50px rgba(34,197,94,0.7); }
        }
      `}</style>
    </div>
  );
}
