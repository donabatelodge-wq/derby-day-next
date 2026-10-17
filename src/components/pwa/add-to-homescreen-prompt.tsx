"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Share, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  getDeferredInstallPrompt,
  clearDeferredInstallPrompt,
  subscribeInstallPromptAvailable,
} from "@/lib/install-prompt";

const DISMISSED_KEY = "derbyday_a2hs_dismissed_at";
const INSTALLED_KEY = "derbyday_a2hs_installed";
const REASK_AFTER_MS = 7 * 24 * 60 * 60 * 1000; // ask again after a week
const HIDDEN_PATHS = ["/login", "/signup", "/auth"];

// A small card that offers "Add to Home Screen" to signed-in people who have
// joined (or created) at least one group. It lives in the root layout, so it
// works on whatever page they land on — including the group page they arrive
// at from an invite link, which never passes through the login page.
export function AddToHomeScreenPrompt() {
  const pathname = usePathname();
  const [platform, setPlatform] = useState<"ios" | "android" | null>(null);
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
    if (!prompt) { dismiss(); return; }
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
  if (platform === "android" && !canInstall) return null;

  return (
    <div className="fixed left-0 right-0 z-[60] flex justify-center px-4 pointer-events-none"
      style={{ bottom: "calc(5rem + env(safe-area-inset-bottom))" }}>
      <div className="pointer-events-auto w-full max-w-md rounded-2xl p-4 shadow-2xl bg-white border border-slate-200">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
            style={{ background: "rgba(34,197,94,0.12)" }}>
            🏇
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-900 text-sm">Add Derby Day to your home screen</p>
            <p className="text-xs text-slate-500 mt-0.5">One tap to open it, just like a real app.</p>

            {platform === "ios" && (
              <p className="text-xs text-slate-700 mt-2 leading-relaxed">
                Tap the <Share className="w-3.5 h-3.5 inline mx-0.5 -mt-0.5" /> Share button, then
                choose <span className="font-semibold">Add to Home Screen</span>.
              </p>
            )}

            <div className="flex gap-2 mt-3">
              {platform === "android" && (
                <button onClick={handleAdd}
                  className="h-9 px-4 rounded-lg text-white font-bold text-sm active:scale-95 transition-transform"
                  style={{ background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)" }}>
                  Add
                </button>
              )}
              <button onClick={dismiss}
                className="h-9 px-4 rounded-lg text-slate-500 font-semibold text-sm">
                {platform === "ios" ? "Got it" : "Not now"}
              </button>
            </div>
          </div>
          <button onClick={dismiss} aria-label="Close" className="text-slate-300 hover:text-slate-500">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
