const DEFAULT_INTRO =
  "Players in a Racing Group pay the agreed join fee privately to the Group organiser. " +
  "Players then make horse selections and a Best Chance selection on each day of the " +
  "arranged competition.";

const DEFAULT_FOOTER =
  "Points are awarded as follows: 3 win, 2 second, 1 third. Double points for the Best " +
  "Chance selection. The Competition Leaderboard shows your progress, till an eventual " +
  "winner.";

// Plain text from the admin screen: a blank line starts a new paragraph,
// and lines starting with "- " become bullets.
function RichText({ text }: { text: string }) {
  const blocks = text.replace(/\r/g, "").split(/\n{2,}/).map(b => b.trim()).filter(Boolean);
  return (
    <div className="space-y-3">
      {blocks.map((block, bi) => {
        const lines = block.split("\n");
        const parts: { bullet: boolean; lines: string[] }[] = [];
        for (const line of lines) {
          const isBullet = /^\s*-\s+/.test(line);
          const clean = isBullet ? line.replace(/^\s*-\s+/, "") : line;
          const last = parts[parts.length - 1];
          if (last && last.bullet === isBullet) last.lines.push(clean);
          else parts.push({ bullet: isBullet, lines: [clean] });
        }
        return (
          <div key={bi} className="space-y-1">
            {parts.map((p, pi) =>
              p.bullet ? (
                <ul key={pi} className="list-disc pl-5 space-y-1 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  {p.lines.map((l, li) => <li key={li}>{l}</li>)}
                </ul>
              ) : (
                <p key={pi} className="text-sm leading-relaxed whitespace-pre-line" style={{ color: "var(--text-secondary)" }}>
                  {p.lines.join("\n")}
                </p>
              )
            )}
          </div>
        );
      })}
    </div>
  );
}

export function HowItWorksCard({ intro, footer }: { intro?: string | null; footer?: string | null }) {
  const introText = intro && intro.trim() ? intro : DEFAULT_INTRO;
  const footerText = footer && footer.trim() ? footer : DEFAULT_FOOTER;
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

      <RichText text={introText} />

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

      <RichText text={footerText} />
    </div>
  );
}
