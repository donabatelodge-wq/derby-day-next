export function HowItWorksCard() {
  return (
    <div
      className="w-full rounded-2xl px-5 py-5 mt-8"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
    >
      <p
        className="text-xs font-semibold uppercase tracking-widest mb-2"
        style={{ color: "var(--text-muted)" }}
      >
        🏇 How A Racing Competition Works
      </p>

      <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
        Players in a Racing Group pay the agreed join fee privately to the Group organiser.
        Players then make horse selections and a Best Chance selection on each day of the
        arranged competition.
      </p>

      <div className="flex flex-wrap gap-2 my-4">
        {[
          { label: "Win", pts: "3 pts" },
          { label: "2nd", pts: "2 pts" },
          { label: "3rd", pts: "1 pt" },
        ].map(p => (
          <div
            key={p.label}
            className="rounded-xl px-3 py-2 text-center"
            style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)" }}
          >
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>{p.label}</p>
            <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{p.pts}</p>
          </div>
        ))}
        <div
          className="rounded-xl px-3 py-2 text-center"
          style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.4)" }}
        >
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Best Chance</p>
          <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Double points</p>
        </div>
      </div>

      <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
        Points are awarded as follows: 3 win, 2 second, 1 third. Double points for the Best
        Chance selection. The Competition Leaderboard shows your progress, till an eventual
        winner.
      </p>
    </div>
  );
}
