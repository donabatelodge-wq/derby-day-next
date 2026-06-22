"use client";

import { useMemo, useState } from "react";
import { Trophy } from "lucide-react";
import { getLeaderboard, getGroupStatus } from "@/lib/leaderboard";
import type { Entry, Group, Meeting } from "@/lib/types";

interface LeaderboardCardProps {
  group: Group;
  meetings: Meeting[];
  entries: Entry[];
  currentUserEmail: string | null;
  isOwnerOrAdmin: boolean;
}

export function LeaderboardCard({
  group,
  meetings,
  entries,
  currentUserEmail,
  isOwnerOrAdmin,
}: LeaderboardCardProps) {
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);

  const groupMeetingIds =
    (group.daily_meeting_ids ?? []).length > 0
      ? group.daily_meeting_ids.map((d) => d.meeting_id)
      : group.meeting_ids ?? [];

  const groupMeetings = meetings.filter((m) => groupMeetingIds.includes(m.id));

  const leaderboard = useMemo(
    () => getLeaderboard(group, entries, selectedMeetingId),
    [group, entries, selectedMeetingId]
  );

  const status = useMemo(() => getGroupStatus(group, groupMeetings), [group, groupMeetings]);

  const currentMeeting = groupMeetings.find((m) => m.id === selectedMeetingId) ?? null;

  const handleShareLeaderboard = () => {
    const meetingName = currentMeeting ? currentMeeting.name : group.name;
    const medals = ["🥇", "🥈", "🥉"];
    const lines = leaderboard.map((entry, index) => {
      const medal = medals[index] ?? `${index + 1}.`;
      const name = entry.participantName || entry.email.split("@")[0];
      return `${medal} ${name} — ${entry.total}pts`;
    });
    const shareText = `🏇 ${meetingName} Leaderboard\n\n${lines.join("\n")}\n\n🏇 Derby Day`;

    if (navigator.share) {
      navigator.share({ title: `${group.name} Leaderboard`, text: shareText }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareText).catch(() => {});
    }
  };

  return (
    <div className="space-y-4">
      {status === "completed" && leaderboard.length > 0 && (
        <div className="rounded-2xl border-2 border-amber-400 bg-amber-50 px-5 py-4 flex items-center gap-3">
          <span className="text-3xl flex-shrink-0">🏆</span>
          <div className="flex-1">
            <p className="font-bold text-amber-800 text-base">
              {leaderboard[0].participantName || leaderboard[0].email.split("@")[0]} wins with{" "}
              {leaderboard[0].total} points!
            </p>
            <p className="text-xs text-amber-600 mt-0.5">Competition complete</p>
          </div>
        </div>
      )}

      {groupMeetings.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedMeetingId(null)}
            className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap ${
              selectedMeetingId === null ? "bg-green-500 text-white" : "bg-white border border-slate-200 text-slate-500"
            }`}
          >
            Overall
          </button>
          {groupMeetings.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelectedMeetingId(m.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap ${
                selectedMeetingId === m.id ? "bg-green-500 text-white" : "bg-white border border-slate-200 text-slate-500"
              }`}
            >
              {m.name}
            </button>
          ))}
        </div>
      )}

      {isOwnerOrAdmin && leaderboard.length > 0 && (
        <button
          onClick={handleShareLeaderboard}
          className="w-full py-3 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2"
          style={{ background: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)" }}
        >
          Share Leaderboard
        </button>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-green-500" />
          <h2 className="font-semibold text-sm text-slate-900">
            {currentMeeting ? `${currentMeeting.name} Leaderboard` : "Overall Leaderboard"}
          </h2>
        </div>
        {leaderboard.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-slate-400">No entries yet.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {leaderboard.map((row, i) => (
              <div key={row.email} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      i === 0
                        ? "bg-green-100 text-green-600"
                        : i === 1
                        ? "bg-slate-100 text-slate-500"
                        : i === 2
                        ? "bg-orange-50 text-orange-500"
                        : "bg-slate-50 text-slate-400"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className="text-sm font-medium text-slate-900">
                    {row.participantName || row.email.split("@")[0]}
                    {row.email === currentUserEmail && (
                      <span className="ml-1 text-xs text-green-500">(you)</span>
                    )}
                  </span>
                </div>
                <span className="font-bold text-sm text-green-500">{row.total} pts</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
