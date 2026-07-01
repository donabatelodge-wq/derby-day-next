import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { HomeButtons } from "@/components/home/home-buttons";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();

  const isAdmin = profile?.role === "admin";

  const { data: groups } = await supabase
    .from("groups")
    .select("id, name, type, status, member_emails, owner_email")
    .or(`owner_email.eq.${user.email},member_emails.cs.{${user.email}}`)
    .neq("status", "archived")
    .order("created_at", { ascending: false });

  const { data: welcomeContent } = await supabase
    .from("welcome_content").select("*").single();

  const content = welcomeContent || {
    title: "Welcome to Derby Day",
    subtitle: "Your ultimate Horse Racing and Football experience",
    show_title: true,
    show_subtitle: true,
    show_racing_competition_button: true,
    show_lms_button: true,
    show_join_group_button: true,
    button_racing_competition_label: "Start A Racing Competition 🏇",
    button_football_competition_label: "Start A Football Competition ⚽",
    button_join_group_label: "Join A Competition",
  };

  const myGroups = groups ?? [];

  return (
    <div className="min-h-screen flex flex-col pb-24" style={{ background: "var(--bg)" }}>
      <div className="flex-1 flex flex-col items-center px-5 py-6">
        <div className="w-full max-w-lg">

          {myGroups.length > 0 && (
            <div className="w-full mb-6">
              <p className="text-xs font-semibold uppercase tracking-widest mb-3"
                style={{ color: "var(--text-muted)" }}>
                🏆 Your Live Competitions
              </p>
              <div className="flex flex-col gap-3">
                {myGroups.slice(0, 3).map((g, index) => {
                  const isFirst = index === 0;
                  const emoji = g.type === "last_man_standing" ? "⚽" : "🏇";
                  return (
                    <Link key={g.id} href={`/group/${g.id}`}
                      className="w-full text-left rounded-2xl px-4 py-4 transition-transform active:scale-95 block"
                      style={{
                        background: isFirst ? "linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)" : "var(--bg-card)",
                        border: isFirst ? "2px solid #f59e0b" : "1px solid var(--border)",
                        boxShadow: isFirst ? "0 4px 20px rgba(245,158,11,0.2)" : "none"
                      }}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-sm" style={{ color: isFirst ? "#ffffff" : "var(--text-primary)" }}>
                            {emoji} {g.name}
                          </p>
                          <p className="text-xs mt-0.5" style={{ color: isFirst ? "rgba(255,255,255,0.6)" : "var(--text-muted)" }}>
                            {(g.member_emails || []).length} players{isFirst ? " · Active now" : ""}
                          </p>
                        </div>
                        <span style={{ color: isFirst ? "#f59e0b" : "var(--text-muted)" }}>→</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {content.show_title !== false && (
            <h1 className="text-4xl font-bold tracking-tight mb-3 text-center" style={{ color: "var(--text-primary)" }}>
              {content.title}
            </h1>
          )}

          {content.show_subtitle !== false && content.subtitle && (
            <p className="text-lg mb-8 text-center" style={{ color: "var(--text-secondary)" }}>
              {content.subtitle}
            </p>
          )}

          <HomeButtons content={content} isAdmin={isAdmin} userEmail={user.email ?? ""} />

        </div>
      </div>
    </div>
  );
}
