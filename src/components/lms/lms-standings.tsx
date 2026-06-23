"use client";

import { Trophy, X } from "lucide-react";

interface Participant {
  email: string;
  name: string;
  status: "alive" | "eliminated";
  weeksAlive: number;
  eliminatedWeek?: number;
  currentPick?: string;
}

interface Props {
  participants: Participant[];
  currentUserEmail: string | null;
  competition: any;
}

export default function LmsStandings({ participants, currentUserEmail, competition }: Props) {
  const alive = participants.filter(p => p.status === "alive").sort((a, b) => b.weeksAlive - a.weeksAlive);
  const eliminated = participants.filter(p => p.status === "eliminated").sort((a, b) => b.weeksAlive - a.weeksAlive);

  const Row = ({ p, rank }: { p: Participant; rank: number }) => (
    <div className={`flex items-center justify-between px-5 py-3 ${p.email === currentUserEmail ? "bg-purple-50" : ""}`}>
      <div className="flex items-center gap-3">
        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
          ${rank === 1 ? "bg-amber-100 text-amber-600" : rank === 2 ? "bg-slate-100 text-slate-500" : rank === 3 ? "bg-orange-50 text-orange-500" : "bg-slate-50 text-slate-400"}`}>
          {p.status === "eliminated" ? <X className="w-3 h-3 text-red-400" /> : rank}
        </span>
        <div>
          <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            {p.name || p.email}
            {p.email === currentUserEmail && <span className="ml-1 text-xs text-purple-500">(you)</span>}
          </p>
          {p.currentPick && p.status === "alive" && (
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>This week: {p.currentPick}</p>
          )}
          {!p.currentPick && p.status === "alive" && (
            <p className="text-xs text-amber-500">⚠ No pick yet</p>
          )}
        </div>
      </div>
      <div className="text-right">
        <span className={`text-sm font-bold ${p.status === "alive" ? "text-purple-600" : "text-slate-400"}`}>
          {p.weeksAlive}w
        </span>
        {p.status === "eliminated" && (
          <p className="text-xs text-red-400">Out wk {p.eliminatedWeek}</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      {competition?.status === "completed" && competition?.winner_name && (
        <div className="rounded-2xl border-2 border-amber-400 bg-amber-50 px-5 py-4 flex items-center gap-3">
          <span className="text-3xl">🏆</span>
          <div>
            <p className="font-bold text-amber-800 text-base">{competition.winner_name} wins!</p>
            <p className="text-xs text-amber-600 mt-0.5">This competition has concluded.</p>
          </div>
        </div>
      )}
      <div className="rounded-2xl border overflow-hidden" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
        {alive.length > 0 && (
          <>
            <div className="px-5 py-3 border-b flex items-center gap-2" style={{ borderColor: "var(--border)", background: "rgba(168,85,247,0.05)" }}>
              <Trophy className="w-4 h-4 text-purple-500" />
              <span className="text-xs font-semibold text-purple-600 uppercase tracking-wide">Still In ({alive.length})</span>
            </div>
            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              {alive.map((p, i) => <Row key={p.email} p={p} rank={i + 1} />)}
            </div>
          </>
        )}
        {eliminated.length > 0 && (
          <>
            <div className="px-5 py-3 border-b border-t flex items-center gap-2" style={{ borderColor: "var(--border)", background: "rgba(239,68,68,0.04)" }}>
              <X className="w-4 h-4 text-red-400" />
              <span className="text-xs font-semibold text-red-400 uppercase tracking-wide">Eliminated ({eliminated.length})</span>
            </div>
            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              {eliminated.map((p, i) => <Row key={p.email} p={p} rank={i + 1} />)}
            </div>
          </>
        )}
        {alive.length === 0 && eliminated.length === 0 && (
          <div className="px-5 py-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>No participants yet.</div>
        )}
      </div>
    </div>
  );
}
