"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Share, X, MoreVertical } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  getDeferredInstallPrompt,
  clearDeferredInstallPrompt,
  subscribeInstallPromptAvailable,
} from "@/lib/install-prompt";

const DISMISSED_KEY = "derbyday_a2hs_dismissed_at";
const INSTALLED_KEY = "derbyday_a2hs_installed";
const REASK_AFTER_MS = 30 * 24 * 60 * 60 * 1000; // ask again after a month
const HIDDEN_PATHS = ["/login", "/signup", "/auth"];

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

// Offers "Add to Home Screen" to signed-in people who have joined (or created)
// at least one group. Lives in the root layout, so it works on whatever page they
// land on — including the group page they arrive at from an invite link.
export function AddToHomeScreenPrompt() {
  const pathname = usePathname();
  const [platform, setPlatform] = useState<"ios" | "android" | null>(null);
  const [inAppBrowser, setInAppBrowser] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const [dismissed, setDismissed] = useState(true); // hidden until we've checked storage
  const [eligible, setEligible] = useState(false);
  const checked = useRef(false);

  // One-time setup: platform, already-installed, previously dismissed.
  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    if (isStandalone) return; // already running as an installed app

    const ua = window.navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) setPlatform("ios");
    else if (/android/.test(ua)) setPlatform("android");
    // Facebook / Instagram / Gmail-style in-app browsers can't add to home screen.
    setInAppBrowser(/fban|fbav|instagram|line\/|gsa\/|twitter|linkedinapp/.test(ua));

    try {
      const installed = localStorage.getItem(INSTALLED_KEY) === "true";
      const at = Number(localStorage.getItem(DISMISSED_KEY) || 0);
      const recentlyDismissed = at > 0 && Date.now() - at < REASK_AFTER_MS;
      setDismissed(installed || recentlyDismissed);
    } catch {
      setDismissed(false);
    }

    setCanInstall(!!getDeferredInstallPrompt());
    const unsubscribe = subscribeInstallPromptAvailable(setCanInstall);

    const onInstalled = () => {
      try { localStorage.setItem(INSTALLED_KEY, "true"); } catch {}
      setDismissed(true);
    };
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      unsubscribe();
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // On each page change: are they signed in AND in at least one group?
  useEffect(() => {
    if (!platform || dismissed || checked.current) return;
    if (HIDDEN_PATHS.some(p => pathname.startsWith(p))) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email || cancelled) return;

      const email = user.email;
      const { data: groups } = await supabase
        .from("groups")
        .select("id")
        .or(`owner_email.eq.${email},member_emails.cs.{${email}}`)
        .limit(1);
      if (cancelled || !groups || groups.length === 0) return;

      checked.current = true;
      // Short pause so it doesn't pop up on top of the page while it loads.
      timer = setTimeout(() => { if (!cancelled) setEligible(true); }, 2000);
    })();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [pathname, platform, dismissed]);

  const dismiss = () => {
    try { localStorage.setItem(DISMISSED_KEY, String(Date.now())); } catch {}
    setDismissed(true);
  };

  const handleAdd = async () => {
    const prompt = getDeferredInstallPrompt();
    if (!prompt) return;
    try {
      prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice?.outcome === "accepted") {
        try { localStorage.setItem(INSTALLED_KEY, "true"); } catch {}
      } else {
        try { localStorage.setItem(DISMISSED_KEY, String(Date.now())); } catch {}
      }
    } catch {
      // prompt already used or unavailable — just close the card
    }
    clearDeferredInstallPrompt();
    setDismissed(true);
  };

  if (!platform || dismissed || !eligible) return null;
  if (HIDDEN_PATHS.some(p => pathname.startsWith(p))) return null;

  return (
    <div className="fixed left-0 right-0 z-[60] flex justify-center px-4 pointer-events-none"
      style={{ bottom: "calc(5rem + env(safe-area-inset-bottom))" }}>
      <div className="pointer-events-auto w-full max-w-md rounded-2xl p-5 shadow-2xl bg-white border border-slate-200">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
            style={{ background: "rgba(34,197,94,0.12)" }}>
            🏇
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-900 text-base">Add Derby Day to your home screen</p>
            <p className="text-xs text-slate-500 mt-0.5">Open it in one tap, like a real app.</p>
          </div>
          <button onClick={dismiss} aria-label="Close" className="text-slate-300 hover:text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        {platform === "ios" && (
          <ol className="space-y-2.5 mt-4">
            <Step n={1}>
              {inAppBrowser
                ? <>Open this page in <span className="font-semibold">Safari</span> (use the ⋯ menu → Open in Safari).</>
                : <>Open Derby Day in <span className="font-semibold">Safari</span>.</>}
            </Step>
            <Step n={2}>
              Tap the <span className="font-semibold">Share</span> button{" "}
              <Share className="w-4 h-4 inline -mt-0.5" /> at the bottom or top of the screen.
            </Step>
            <Step n={3}>
              Scroll down and tap <span className="font-semibold">Add to Home Screen</span>.
            </Step>
            <Step n={4}>
              Tap <span className="font-semibold">Add</span> in the top right corner.
            </Step>
          </ol>
        )}

        {platform === "android" && (
          <>
            {canInstall ? (
              <button onClick={handleAdd}
                className="w-full h-12 mt-4 rounded-xl text-white font-bold text-base active:scale-95 transition-transform"
                style={{ background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)" }}>
                Add to Home Screen
              </button>
            ) : (
              <ol className="space-y-2.5 mt-4">
                <Step n={1}>
                  {inAppBrowser
                    ? <>Open this page in <span className="font-semibold">Chrome</span> (use the ⋮ menu → Open in Chrome).</>
                    : <>Open Derby Day in <span className="font-semibold">Chrome</span>.</>}
                </Step>
                <Step n={2}>
                  Tap the three dots <MoreVertical className="w-4 h-4 inline -mt-0.5" /> at the top right.
                </Step>
                <Step n={3}>
                  Tap <span className="font-semibold">Install app</span> or{" "}
                  <span className="font-semibold">Add to Home screen</span>.
                </Step>
                <Step n={4}>
                  Tap <span className="font-semibold">Add</span> or <span className="font-semibold">Install</span>.
                </Step>
              </ol>
            )}
          </>
        )}

        <p className="text-xs text-slate-500 mt-4 leading-relaxed">
          Open Derby Day from your home screen and sign in once. After that you&apos;ll stay signed in.
        </p>

        <button onClick={dismiss}
          className="mt-3 h-9 px-1 text-slate-500 font-semibold text-sm">
          {canInstall && platform === "android" ? "Not now" : "Got it"}
        </button>
      </div>
    </div>
  );
}
