import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function HomePage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: groups } = await supabase
    .from("groups")
    .select("id, name, type, status, member_emails, invite_code")
    .or(`owner_email.eq.${user.email},member_emails.cs.{${user.email}}`)
    .order("created_at", { ascending: false });

  const activeGroups = (groups ?? []).filter((g) => g.status !== "archived");

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-4 py-10 pb-24">

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">🏇 Derby Day</h1>
          <p className="text-sm text-slate-500 mt-1">Welcome back, {user.email}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-8">
          <Link
            href="/group/new"
            className="flex flex-col items-center justify-center gap-2 p-5 rounded-2xl bg-green-500 hover:bg-green-600 text-white font-semibold text-sm transition-colors text-center"
          >
            <span className="text-2xl">➕</span>
            Create Competition
          </Link>
          <Link
            href="/join"
            className="flex flex-col items-center justify-center gap-2 p-5 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm transition-colors text-center"
          >
            <span className="text-2xl">🎯</span>
            Join Competition
          </Link>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Your Competitions
          </h2>

          {activeGroups.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
              <p className="text-slate-400 text-sm">No competitions yet.</p>
              <p className="text-slate-400 text-sm mt-1">Create one or join with an invite code.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeGroups.map((group) => (
                <Link
                  key={group.id}
                  href={`/group/${group.id}`}
                  className="flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-200 hover:border-green-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">
                      {group.type === "last_man_standing" ? "⚽" : "🏇"}
                    </span>
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">{group.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {group.member_emails?.length ?? 0} member{(group.member_emails?.length ?? 0) !== 1 ? "s" : ""}
                        {" · "}
                        <span className="font-mono text-green-500">{group.invite_code}</span>
                      </p>
                    </div>
                  </div>
                  <span className="text-slate-300">›</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <form action="/auth/signout" method="post" className="mt-10 text-center">
          <button
            type="submit"
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            Sign out
          </button>
        </form>

      </div>
    </div>
  );
}
