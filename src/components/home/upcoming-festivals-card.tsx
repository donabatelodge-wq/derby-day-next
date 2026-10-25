import Link from "next/link";
import { format } from "date-fns";

export type FestivalItem = {
  id: string;
  name: string;
  description: string | null;
  ms: { id: string; date: string; venue: string | null }[];
};

function shortDate(date: string) {
  try { return format(new Date(date), "EEE d MMM"); } catch { return date; }
}

export function UpcomingFestivalsCard({ festivals }: { festivals: FestivalItem[] }) {
  if (festivals.length === 0) return null;

  return (
    <div className="w-full mt-6 rounded-3xl border p-5"
      style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
      <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>
        🏆 Upcoming Racing Festivals
      </p>
      <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
        Start a competition for a festival in a few taps. Races for each day are added the day before.
      </p>
      <div className="flex flex-col gap-3">
        {festivals.map(f => {
          const first = f.ms[0];
          const last = f.ms[f.ms.length - 1];
          const venues = Array.from(new Set(f.ms.map(m => m.venue).filter(Boolean)));
          return (
            <Link key={f.id} href={`/group/new?type=horse_racing&festival=${f.id}`}
              className="block rounded-2xl px-4 py-4 border transition-transform active:scale-95"
              style={{ borderColor: "var(--border)" }}>
              <p className="font-bold text-base" style={{ color: "var(--text-primary)" }}>{f.name}</p>
              <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
                {first.id === last.id ? shortDate(first.date) : `${shortDate(first.date)} – ${shortDate(last.date)}`}
                {" · "}{f.ms.length} meeting{f.ms.length > 1 ? "s" : ""}
              </p>
              {venues.length > 0 && (
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{venues.join(" · ")}</p>
              )}
              {f.description && (
                <p className="text-sm mt-2" style={{ color: "var(--text-secondary)" }}>{f.description}</p>
              )}
              <p className="text-sm font-semibold text-amber-500 mt-3">Start a competition →</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
