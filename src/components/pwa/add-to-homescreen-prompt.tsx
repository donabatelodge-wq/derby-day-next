"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  getDeferredInstallPrompt,
  clearDeferredInstallPrompt,
  subscribeInstallPromptAvailable,
} from "@/lib/install-prompt";
import { detectInstallEnv, stepKindFor, type InstallEnv } from "@/lib/install-env";
import { InstallSteps } from "@/components/pwa/install-steps";

const DISMISSED_KEY = "derbyday_a2hs_dismissed_at";
const INSTALLED_KEY = "derbyday_a2hs_installed";
const REASK_AFTER_MS = 14 * 24 * 60 * 60 * 1000; // ask again after two weeks
const HIDDEN_PATHS = ["/login", "/signup", "/auth", "/install"];

// Offers "Add to Home Screen" to signed-in people who have joined (or created)
// at least one group. Lives in the root layout, so it works on whatever page they
// land on — including the group page they arrive at from an invite link.
export function AddToHomeScreenPrompt() {
  const pathname = usePathname();
  const [env, setEnv] = useState<InstallEnv | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [dismissed, setDismissed] = useState(true); // hidden until we've checked storage
  const [eligible, setEligible] = useState(false);
  const checked = useRef(false);

  // One-time setup: phone/browser, already-installed, previously dismissed.
  useEffect(() => {
    const e = detectInstallEnv();
    if (e.standalone || e.os === "desktop") return; // already installed, or not a phone
    setEnv(e);

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
    if (!env || dismissed || checked.current) return;
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
  }, [pathname, env, dismissed]);

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

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied. Paste it into your browser.");
    } catch {
      toast.error("Couldn't copy. Please use the menu to open this page in your browser.");
    }
  };

  if (!env || dismissed || !eligible) return null;
  if (HIDDEN_PATHS.some(p => pathname.startsWith(p))) return null;

  const kind = stepKindFor(env);
  const oneTap = env.os === "android" && canInstall && !env.inApp;

  return (
    <div className="fixed left-0 right-0 z-[60] flex justify-center px-4 pointer-events-none"
      style={{ bottom: "calc(5rem + env(safe-area-inset-bottom))" }}>
      <div className="pointer-events-auto w-full max-w-md rounded-2xl p-5 shadow-2xl bg-white border border-slate-200 max-h-[70vh] overflow-y-auto">
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

        <div className="mt-4">
          {env.inApp ? (
            <div>
              <p className="text-sm text-slate-700 leading-snug">
                This built-in browser can&apos;t add apps to your home screen. Tap the menu{" "}
                ({env.os === "ios" ? "⋯" : "⋮"}) and choose{" "}
                <span className="font-semibold">{env.os === "ios" ? "Open in Safari" : "Open in Chrome"}</span>,
                then try again.
              </p>
              <button onClick={copyLink}
                className="mt-3 h-10 px-4 rounded-xl border border-slate-300 text-sm font-semibold text-slate-700 active:scale-95">
                Copy link
              </button>
            </div>
          ) : oneTap ? (
            <button onClick={handleAdd}
              className="w-full h-12 rounded-xl text-white font-bold text-base active:scale-95 transition-transform"
              style={{ background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)" }}>
              Add to Home Screen
            </button>
          ) : (
            kind && <InstallSteps kind={kind} />
          )}
        </div>

        <p className="text-xs text-slate-500 mt-4 leading-relaxed">
          Open Derby Day from your home screen and sign in once. After that you&apos;ll stay signed in.
        </p>

        <div className="mt-3 flex items-center justify-between">
          <button onClick={dismiss} className="h-9 px-1 text-slate-500 font-semibold text-sm">
            {oneTap ? "Not now" : "Got it"}
          </button>
          <Link href="/install" onClick={dismiss} className="text-xs font-semibold text-green-700 underline">
            Full step-by-step guide
          </Link>
        </div>
      </div>
    </div>
  );
}
