"use client";

import { useEffect, useState } from "react";
import { X, Download, Share } from "lucide-react";

const DISMISS_KEY = "derbyday_a2hs_dismissed";

export function AddToHomeScreenBanner() {
  const [visible, setVisible] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    if (isStandalone) return;

    if (localStorage.getItem(DISMISS_KEY) === "true") return;

    const ua = window.navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(ua);
    const isAndroid = /android/.test(ua);

    if (isIOS) {
      setPlatform("ios");
      setVisible(true);
    } else if (isAndroid) {
      setPlatform("android");
      const handler = (e: any) => {
        e.preventDefault();
        setDeferredPrompt(e);
        setVisible(true);
      };
      window.addEventListener("beforeinstallprompt", handler);
      return () => window.removeEventListener("beforeinstallprompt", handler);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "true");
    setVisible(false);
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    dismiss();
  };

  if (!visible || !platform) return null;

  return (
    <div className="w-full rounded-2xl p-4 mb-5 flex items-center gap-3 shadow-sm"
      style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f4c2a 100%)" }}>
      <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0 text-xl">
        🏇
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white">Add This App To Your Homescreen</p>
        {platform === "ios" ? (
          <p className="text-xs text-white/60 mt-0.5 flex items-center gap-1 flex-wrap">
            Tap <Share className="w-3.5 h-3.5 inline" /> then &quot;Add to Home Screen&quot;
          </p>
        ) : (
          <p className="text-xs text-white/60 mt-0.5">Quick access, just like a real app</p>
        )}
      </div>
      {platform === "android" && (
        <button onClick={handleInstall}
          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white active:scale-95 transition-all"
          style={{ background: "#22c55e" }}>
          <Download className="w-3.5 h-3.5" /> Install
        </button>
      )}
      <button onClick={dismiss} className="flex-shrink-0 text-white/40 hover:text-white/70 transition-colors">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
