"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import {
  getDeferredInstallPrompt,
  clearDeferredInstallPrompt,
  subscribeInstallPromptAvailable,
} from "@/lib/install-prompt";
import { detectInstallEnv, stepKindFor, type InstallEnv, type StepKind } from "@/lib/install-env";
import { InstallSteps } from "@/components/pwa/install-steps";

const INSTALLED_KEY = "derbyday_a2hs_installed";

const OPTIONS: { kind: StepKind; label: string }[] = [
  { kind: "ios", label: "iPhone" },
  { kind: "chrome", label: "Chrome" },
  { kind: "samsung", label: "Samsung Internet" },
  { kind: "firefox", label: "Firefox" },
  { kind: "edge", label: "Edge" },
];

export default function InstallPage() {
  const [env, setEnv] = useState<InstallEnv | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [manual, setManual] = useState<StepKind | null>(null);

  useEffect(() => {
    setEnv(detectInstallEnv());
    setCanInstall(!!getDeferredInstallPrompt());
    return subscribeInstallPromptAvailable(setCanInstall);
  }, []);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/install`);
      toast.success("Link copied. Paste it into your browser.");
    } catch {
      toast.error("Couldn't copy. Please use your browser's menu to open this page.");
    }
  };

  const handleInstall = async () => {
    const prompt = getDeferredInstallPrompt();
    if (!prompt) return;
    try {
      prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice?.outcome === "accepted") {
        try { localStorage.setItem(INSTALLED_KEY, "true"); } catch {}
      }
    } catch {
      // prompt already used or unavailable
    }
    clearDeferredInstallPrompt();
  };

  if (!env) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <div className="w-6 h-6 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const detectedKind = stepKindFor(env);
  const shownKind: StepKind = manual ?? detectedKind ?? "ios";
  const showOneTap = env.os === "android" && canInstall && !env.inApp && manual === null;

  return (
    <div className="min-h-screen px-5 py-6" style={{ background: "var(--bg)" }}>
      <div className="w-full max-w-md mx-auto space-y-5">

        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3 text-3xl"
            style={{ background: "rgba(34,197,94,0.12)" }}>🏇</div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            Add Derby Day to your home screen
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Open it in one tap, like a real app.
          </p>
        </div>

        {env.standalone ? (
          <div className="rounded-2xl p-5 bg-green-50 border border-green-200 text-center">
            <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <p className="font-bold text-green-800">You&apos;re already using the app from your home screen.</p>
            <Link href="/" className="inline-block mt-3 text-sm font-semibold text-green-700 underline">Go to the home page</Link>
          </div>
        ) : (
          <>
            {env.os === "desktop" && (
              <div className="rounded-2xl p-5 bg-white border border-slate-200">
                <p className="text-sm text-slate-700 leading-relaxed">
                  This is for phones. Open <span className="font-semibold">racingcerts.com/install</span> on your phone to add Derby Day to its home screen.
                </p>
                <button onClick={copyLink}
                  className="mt-3 h-10 px-4 rounded-xl border border-slate-300 text-sm font-semibold text-slate-700 active:scale-95">
                  Copy link
                </button>
              </div>
            )}

            {env.inApp && (
              <div className="rounded-2xl p-5 bg-amber-50 border border-amber-300">
                <p className="font-bold text-amber-900 text-base">
                  You&apos;re inside {env.inAppName ? `${env.inAppName}'s` : "an app's"} built-in browser
                </p>
                <p className="text-sm text-amber-800 mt-1 leading-relaxed">
                  Built-in browsers can&apos;t add apps to your home screen. First open this page in{" "}
                  <span className="font-semibold">{env.os === "ios" ? "Safari" : "Chrome"}</span>: tap the menu{" "}
                  ({env.os === "ios" ? "⋯ or the compass icon" : "⋮"}) and choose{" "}
                  <span className="font-semibold">{env.os === "ios" ? "Open in Safari" : "Open in Chrome"}</span>{" "}
                  (or &quot;Open in browser&quot;). Or copy the link and paste it into your browser.
                </p>
                <button onClick={copyLink}
                  className="mt-3 h-10 px-4 rounded-xl bg-amber-500 text-white text-sm font-bold active:scale-95">
                  Copy link
                </button>
              </div>
            )}

            {showOneTap && (
              <button onClick={handleInstall}
                className="w-full h-14 rounded-2xl text-white font-black text-base active:scale-95 transition-transform"
                style={{ background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)" }}>
                Add to Home Screen
              </button>
            )}

            <div className="rounded-2xl p-5 bg-white border border-slate-200">
              <p className="text-sm font-bold text-slate-900 mb-3">
                {showOneTap ? "Or do it by hand" : env.inApp ? "Then, in your browser" : "How to add it"}
              </p>
              <InstallSteps kind={shownKind} />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>
                Different phone or browser?
              </p>
              <div className="flex flex-wrap gap-2">
                {OPTIONS.map(o => (
                  <button key={o.kind} onClick={() => setManual(o.kind)}
                    className={`px-3 py-2 rounded-xl text-sm font-semibold border ${shownKind === o.kind ? "bg-green-500 text-white border-green-500" : "bg-white text-slate-600 border-slate-200"}`}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        <p className="text-xs text-center leading-relaxed" style={{ color: "var(--text-muted)" }}>
          Open Derby Day from your home screen and sign in once. After that you&apos;ll stay signed in.
        </p>
      </div>
    </div>
  );
}
