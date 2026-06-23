import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function MyCompetitionsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: groups } = await supabase
    .from("groups")
    .select("id, name, type, status, member_emails, invite_code, owner_email")
    .or(`owner_email.eq.${user.email},member_emails.cs.{${user.email}}`)
    .neq("status", "archived")
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen pb-24" style={{ background: "var(--bg)" }}>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>My Competitions</h1>
          <Link href="/group/new"
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)" }}>
            + New
          </Link>
        </div>

        {(groups ?? []).length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-10 text-center">
            <div className="text-4xl mb-3">🏆</div>
            <h3 className="font-bold text-slate-900 mb-1">No competitions yet</h3>
            <p className="text-sm text-slate-500 mb-5">Create one or join with an invite code</p>
            <Link href="/group/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-bold"
              style={{ background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)" }}>
              ➕ Create your first group
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {(groups ?? []).map((group) => {
              const isOwner = group.owner_email === user.email;
              const memberCount = group.member_emails?.length ?? 0;
              const isRacing = group.type === "horse_racing";
              return (
                <Link key={group.id} href={`/group/${group.id}`}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-slate-100 hover:border-green-200 hover:shadow-sm transition-all active:scale-95">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                    style={{ background: isRacing ? "rgba(34,197,94,0.1)" : "rgba(168,85,247,0.1)" }}>
                    {isRacing ? "🏇" : "⚽"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 truncate">{group.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {memberCount} member{memberCount !== 1 ? "s" : ""}
                      {isOwner && <span className="ml-2 text-green-500 font-semibold">· Owner</span>}
                      <span className="ml-2 font-mono text-green-500">{group.invite_code}</span>
                    </p>
                  </div>
                  <span className="text-slate-300 text-lg">›</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
