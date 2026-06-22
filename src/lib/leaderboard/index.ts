import type { Entry, Group, LeaderboardRow } from "@/lib/types";

/**
 * Computes the leaderboard for a group, optionally scoped to a single meeting.
 *
 * Ported from the original Base44 `getLeaderboard()` in GroupDetail.jsx, with
 * one important difference: `entries` here is expected to already contain
 * every group member's entries (not just the current user's), because the
 * new Supabase RLS policy `entries_read_group_members` allows any group
 * member to read all entries for their group. That's the fix for the bug
 * that affected Royal Ascot — under the old Base44 RLS, each non-admin user
 * could only read their own Entry rows, so their personal "leaderboard" only
 * ever contained themselves.
 */
export function getLeaderboard(
  group: Group,
  entries: Entry[],
  meetingId: string | null = null
): LeaderboardRow[] {
  const memberEmails = group.member_emails || [];
  const memberNames = group.member_names || {};

  // daily_meeting_ids is the source of truth for which meetings count,
  // falling back to meeting_ids for older/simpler groups.
  const dailyMeetingIds =
    (group.daily_meeting_ids || []).length > 0
      ? group.daily_meeting_ids.map((d) => d.meeting_id)
      : group.meeting_ids || [];

  const scores: Record<string, LeaderboardRow> = {};
  memberEmails.forEach((email) => {
    scores[email] = { email, total: 0, participantName: memberNames[email] ?? null };
  });

  // Dedupe: if a user somehow has more than one entry for the same meeting
  // (shouldn't happen now thanks to the unique constraint, but defend anyway),
  // keep the highest-scoring one rather than double-counting.
  const bestEntries: Record<string, Entry> = {};
  entries.forEach((entry) => {
    if (!memberEmails.includes(entry.user_email)) return;
    if (!dailyMeetingIds.includes(entry.meeting_id)) return;
    if (meetingId && entry.meeting_id !== meetingId) return;

    const key = `${entry.user_email}_${entry.meeting_id}`;
    if (!bestEntries[key] || (entry.total_points || 0) > (bestEntries[key].total_points || 0)) {
      bestEntries[key] = entry;
    }
  });

  Object.values(bestEntries).forEach((entry) => {
    if (!scores[entry.user_email]) {
      scores[entry.user_email] = { email: entry.user_email, total: 0, participantName: null };
    }
    scores[entry.user_email].total += entry.total_points || 0;
    if (!scores[entry.user_email].participantName && entry.participant_name) {
      scores[entry.user_email].participantName = entry.participant_name;
    }
  });

  return Object.values(scores).sort((a, b) => b.total - a.total);
}

export type GroupCompetitionStatus = "upcoming" | "in_progress" | "completed";

/**
 * Determines whether a group's competition is upcoming / in progress / completed.
 *
 * Ported from the original `getGroupStatus()`, with the fix the Ascot bug
 * exposed: completion now requires that EVERY meeting tied to the group
 * (via daily_meeting_ids, falling back to meeting_ids) is marked completed
 * AND the final deadline has passed — not just the first one. This is what
 * stoped the app from prematurely declaring a "winner" with races still
 * to run.
 */
export function getGroupStatus(
  group: Group,
  meetings: Pick<import("@/lib/types").Meeting, "id" | "status" | "date">[]
): GroupCompetitionStatus {
  const now = new Date();

  const meetingIds =
    (group.daily_meeting_ids || []).length > 0
      ? group.daily_meeting_ids.map((d) => d.meeting_id)
      : group.meeting_ids || [];

  const groupMeetings = meetings.filter((m) => meetingIds.includes(m.id));

  if (groupMeetings.length === 0) return "upcoming";

  const allMeetingsDone = groupMeetings.every(
    (m) => m.status === "completed" || m.status === "closed"
  );

  // Use the LATEST meeting date as the effective deadline for "is this really over",
  // rather than group.start_deadline (which only reflects the first meeting/day).
  const latestMeetingDate = groupMeetings.reduce<Date | null>((latest, m) => {
    const d = new Date(m.date);
    return !latest || d > latest ? d : latest;
  }, null);

  const pastFinalMeetingDate = latestMeetingDate ? now > latestMeetingDate : false;

  if (allMeetingsDone && pastFinalMeetingDate) return "completed";

  const deadline = group.start_deadline ? new Date(group.start_deadline) : null;
  const hasStarted = deadline
    ? now > deadline
    : groupMeetings.some((m) => m.status === "open" || m.status === "completed" || m.status === "closed");

  return hasStarted ? "in_progress" : "upcoming";
}
