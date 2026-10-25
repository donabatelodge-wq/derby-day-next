import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import Link from "next/link";
import { HomeButtons } from "@/components/home/home-buttons";
import { AddToHomeScreenBanner } from "@/components/home/add-to-homescreen-banner";
import { IosAddToHomeScreenOverlay } from "@/components/home/ios-add-to-homescreen-overlay";
import { HowItWorksCard } from "@/components/home/how-it-works-card";
import { UpcomingFestivalsCard, type FestivalItem } from "@/components/home/upcoming-festivals-card";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let isAdmin = false;
  let myGroups: any[] = [];

  if (user) {
    const { data: profile } = await supabase
      .from("profiles").select("role").eq("id", user.id).single();
    isAdmin = profile?.role === "admin";

    const { data: groups } = await supabase
      .from("groups")
      .select("id, name, type, status, member_emails, owner_email")
      .or(`owner_email.eq.${user.email},member_emails.cs.{${user.email}}`)
      .neq("status", "archived")
      .order("created_at", { ascending: false });
    myGroups = groups ?? [];
  }

  // Public page content is read on the server with the service client so
  // signed-out visitors see it too. Only non-sensitive fields reach the page.
  const service = createServiceClient();
  const { data: welcomeContent } = await service
    .from("welcome_content").select("*").limit(1).maybeSingle();

  const content: any = welcomeContent || {
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

  // Published festivals that haven't started yet. Mirrors the create-group
  // flow: only open meetings count, and a festival drops off once its first
  // meeting date has passed. Any failure just hides the card.
  let festivals: FestivalItem[] = [];
  if (content.show_upcoming_festivals !== false) {
    try {
      const db: any = service;
      const { data: fs } = await db.from("festivals").select("*").eq("published", true);
      const ids = Array.from(new Set((fs ?? []).flatMap((f: any) => f.meeting_ids || []))) as string[];
      if (ids.length > 0) {
        const { data: ms } = await db
          .from("meetings")
          .select("id, name, date, venue, status")
          .in("id", ids)
          .not("status", "in", '("closed","completed")');
        const meetingList: any[] = ms ?? [];
        const today = new Date().toISOString().slice(0, 10);
        festivals = (fs ?? [])
          .map((f: any) => ({
            id: f.id,
            name: f.name,
            description: f.description ?? null,
            ms: (f.meeting_ids || [])
              .map((id: string) => meetingList.find((m: any) => m.id === id))
              .filter(Boolean)
              .sort((a: any, b: any) => String(a.date).localeCompare(String(b.date))),
          }))
          .filter((f: FestivalItem) => f.ms.length > 0 && String(f.ms[0].date).slice(0, 10) >= today)
          .sort((a: FestivalItem, b: FestivalItem) => String(a.ms[0].date).localeCompare(String(b.ms[0].date)))
          .slice(0, 5);
      }
    } catch {
      festivals = [];
    }
  }

  return (
    <div className="min-h-screen flex flex-col pb-24" style={{ background: "var(--bg)" }}>
      <div className="flex-1 flex flex-col items-center px-5 py-6">
        <div className="w-full max-w-lg">

          {user && <AddToHomeScreenBanner />}
          {user && <IosAddToHomeScreenOverlay />}

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

          {!user && (
            <div className="w-full mb-6 flex flex-col items-center gap-3">
              <Link href="/signup"
                className="w-full h-14 rounded-2xl text-white font-black text-base flex items-center justify-center transition-transform active:scale-95"
                style={{ background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)" }}>
                Create Free Account
              </Link>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                Already have an account?{" "}
                <Link href="/login" className="font-bold underline text-green-600">Sign in</Link>
              </p>
            </div>
          )}

          <HomeButtons content={content} isAdmin={isAdmin} userEmail={user?.email ?? ""} />

          <UpcomingFestivalsCard festivals={festivals} signedIn={!!user} />

          {content.show_how_competition_works !== false && <HowItWorksCard />}

        </div>
      </div>
    </div>
  );
}
