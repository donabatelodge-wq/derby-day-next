"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import {
  getDeferredInstallPrompt,
  clearDeferredInstallPrompt,
  subscribeInstallPromptAvailable,
} from "@/lib/install-prompt";

const IOS_OVERLAY_FLAG_KEY = "derbyday_show_a2hs_overlay";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [platform, setPlatform] = useState<"ios" | "android" | null>(null);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    if (isStandalone) return; // already installed — nothing to offer

    const ua = window.navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) setPlatform("ios");
    else if (/android/.test(ua)) setPlatform("android");

    setCanInstall(!!getDeferredInstallPrompt());
    return subscribeInstallPromptAvailable(setCanInstall);
  }, []);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Android: if the browser's install prompt is ready, fire it right here
    // as part of the same tap — this is the one platform where "Sign In and
    // Add Shortcut" can really do both things in one button.
    if (platform === "android") {
      const prompt = getDeferredInstallPrompt();
      if (prompt) {
        try {
          prompt.prompt();
          await prompt.userChoice;
        } catch {
          // user dismissed it or the prompt was already used — fine either way
        }
        clearDeferredInstallPrompt();
      }
    }

    // iPhone: there's no equivalent button-triggerable install — instead,
    // flag the home page to show one clear "add to home screen" overlay
    // right after this first sign-in, instead of relying on a banner that's
    // easy to miss under the phone's own "Save Password" prompt.
    if (platform === "ios") {
      try {
        sessionStorage.setItem(IOS_OVERLAY_FLAG_KEY, "true");
      } catch {
        // sessionStorage unavailable — just skip the overlay, not worth failing login over
      }
    }

    router.push("/");
    router.refresh();
  };

  const buttonLabel = loading
    ? "Signing in..."
    : platform === "android" && canInstall
      ? "Sign In and Add Shortcut"
      : "Sign In";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5"
      style={{
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f4c2a 100%)",
        paddingTop: "calc(1.5rem + var(--safe-top, 0px))",
        paddingBottom: "calc(1.5rem + var(--safe-bottom, 0px))",
      }}>

      <div className="w-full max-w-md">

        {/* Branding */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-4xl mb-4"
            style={{ background: "rgba(34,197,94,0.15)", border: "2px solid rgba(34,197,94,0.4)" }}>
            🏇
          </div>
          <h1 className="text-3xl font-black text-white mb-1 tracking-tight">Derby Day</h1>
          <p className="text-green-400 text-sm font-medium">Horse Racing &amp; Football Competitions</p>
        </div>

        {/* Login card */}
        <div className="w-full rounded-3xl px-7 py-8 shadow-2xl" style={{ background: "#ffffff" }}>

          <h2 className="text-2xl font-bold text-slate-900 mb-1">Sign In</h2>
          <p className="text-sm text-slate-500 mb-6">Welcome back — enter your details below</p>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full h-12 rounded-xl border border-slate-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-slate-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                onKeyDown={e => e.key === "Enter" && handleLogin()}
                className="w-full h-12 rounded-xl border border-slate-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-slate-50"
              />
            </div>

            <button
              onClick={handleLogin}
              disabled={loading || !email || !password}
              className="w-full h-12 rounded-xl text-white font-bold text-base disabled:opacity-50 transition-all active:scale-95"
              style={{ background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)" }}
            >
              {buttonLabel}
            </button>
          </div>

          <p className="text-center text-sm text-slate-500 mt-6">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-green-600 font-bold hover:underline">
              Sign up free
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}
