import { createClient } from "@/lib/supabase/server";
import type { Entry, Group, Meeting } from "@/lib/types";

export interface GroupDetailData {
  group: Group;
  meetings: Meeting[];
  entries: Entry[];
  currentUserEmail: string | null;
}

/**
 * Fetches everything GroupDetail needs in one go, server-side.
 *
 * Unlike the old Base44 version, this does NOT need defensive `.catch(() => [])`
 * fallbacks around every query — the Supabase RLS policies are correct for the
 * access pattern this page actually needs (group members reading all entries
 * for their group), so there's nothing here that's expected to fail for a
 * legitimate group member.
 */
export async function getGroupDetail(groupId: string): Promise<GroupDetailData | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: group, error: groupError } = await supabase
    .from("groups")
    .select("*")
    .eq("id", groupId)
    .single();

  if (groupError || !group) {
    return null;
  }

  const meetingIds: string[] =
    (group.daily_meeting_ids ?? []).length > 0
      ? group.daily_meeting_ids.map((d: { meeting_id: string }) => d.meeting_id)
      : group.meeting_ids ?? [];

  const [{ data: meetings }, { data: entries }] = await Promise.all([
    meetingIds.length > 0
      ? supabase.from("meetings").select("*").in("id", meetingIds)
      : Promise.resolve({ data: [] as Meeting[] }),
    supabase.from("entries").select("*").eq("group_id", groupId),
  ]);

  return {
    group: group as Group,
    meetings: (meetings ?? []) as Meeting[],
    entries: (entries ?? []) as Entry[],
    currentUserEmail: user?.email ?? null,
  };
}
