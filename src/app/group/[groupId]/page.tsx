import { notFound } from "next/navigation";
import { getGroupDetail } from "@/lib/queries/group-detail";
import { LeaderboardCard } from "@/components/group/leaderboard-card";

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const data = await getGroupDetail(groupId);

  if (!data) {
    notFound();
  }

  const { group, meetings, entries, currentUserEmail } = data;

  const isOwner = currentUserEmail === group.owner_email;
  const isMember = currentUserEmail ? group.member_emails.includes(currentUserEmail) : false;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-4 py-10 pb-24">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900">{group.name}</h1>
          <p className="text-sm mt-1 text-slate-500">
            {group.member_emails.length} member{group.member_emails.length !== 1 ? "s" : ""}
            {" · "}
            Invite code: <span className="font-mono font-bold text-green-500">{group.invite_code}</span>
          </p>
        </div>

        <LeaderboardCard
          group={group}
          meetings={meetings}
          entries={entries}
          currentUserEmail={currentUserEmail}
          isOwnerOrAdmin={isOwner}
        />

        {!isMember && !isOwner && (
          <p className="mt-6 text-center text-sm text-slate-400">
            Join this group to submit your own picks.
          </p>
        )}
      </div>
    </div>
  );
}
