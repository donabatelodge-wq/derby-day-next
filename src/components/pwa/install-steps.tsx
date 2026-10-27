import { Share, MoreVertical, Menu } from "lucide-react";
import type { StepKind } from "@/lib/install-env";

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
        {n}
      </span>
      <span className="text-sm text-slate-700 leading-snug">{children}</span>
    </li>
  );
}

const B = ({ children }: { children: React.ReactNode }) => (
  <span className="font-semibold">{children}</span>
);

export function InstallSteps({ kind }: { kind: StepKind }) {
  return (
    <div>
      <ol className="space-y-2.5">
        {kind === "ios" && (
          <>
            <Step n={1}>
              Tap the <B>Share</B> button <Share className="w-4 h-4 inline -mt-0.5" /> at the bottom (or top) of the screen.
            </Step>
            <Step n={2}>Scroll down and tap <B>Add to Home Screen</B>.</Step>
            <Step n={3}>Tap <B>Add</B> in the top right corner.</Step>
          </>
        )}
        {kind === "chrome" && (
          <>
            <Step n={1}>
              Tap the three dots <MoreVertical className="w-4 h-4 inline -mt-0.5" /> at the top right.
            </Step>
            <Step n={2}>Tap <B>Install app</B> or <B>Add to Home screen</B>.</Step>
            <Step n={3}>Tap <B>Install</B> or <B>Add</B>.</Step>
          </>
        )}
        {kind === "samsung" && (
          <>
            <Step n={1}>
              Tap the menu <Menu className="w-4 h-4 inline -mt-0.5" /> (three lines) at the <B>bottom right</B> of the screen.
            </Step>
            <Step n={2}>
              Tap <B>Add page to</B>. On some versions it says <B>Add to Home screen</B> instead.
            </Step>
            <Step n={3}>Tap <B>Home screen</B>, then <B>Add</B>.</Step>
          </>
        )}
        {kind === "firefox" && (
          <>
            <Step n={1}>
              Tap the three dots <MoreVertical className="w-4 h-4 inline -mt-0.5" /> (top right or bottom right).
            </Step>
            <Step n={2}>Tap <B>Install</B> or <B>Add to Home screen</B>.</Step>
            <Step n={3}>Tap <B>Add</B>.</Step>
          </>
        )}
        {kind === "edge" && (
          <>
            <Step n={1}>
              Tap the menu <Menu className="w-4 h-4 inline -mt-0.5" /> at the bottom of the screen.
            </Step>
            <Step n={2}>Tap <B>Add to phone</B> or <B>Add to Home screen</B>.</Step>
            <Step n={3}>Tap <B>Add</B> or <B>Install</B>.</Step>
          </>
        )}
        {kind === "android-other" && (
          <>
            <Step n={1}>Open your browser&apos;s menu (three dots or three lines).</Step>
            <Step n={2}>Look for <B>Install app</B>, <B>Add to Home screen</B> or <B>Add page to</B>.</Step>
            <Step n={3}>Confirm with <B>Add</B> or <B>Install</B>. If you can&apos;t find it, open Derby Day in Chrome and try again.</Step>
          </>
        )}
      </ol>
      <p className="text-xs text-slate-500 mt-3 leading-relaxed">
        {kind === "ios"
          ? "Can't see \"Add to Home Screen\"? Open this page in Safari first."
          : "Menu wording changes a little between phones and versions. If the icon doesn't appear, your Home screen may be locked. On Samsung: Settings, then Home screen, then turn off Lock Home screen layout."}
      </p>
    </div>
  );
}
