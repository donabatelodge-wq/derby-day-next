"use client";

import { useEffect, useState } from "react";
import { X, Share } from "lucide-react";

const FLAG_KEY = "derbyday_show_a2hs_overlay";

// iOS has no API to trigger "Add to Home Screen" from a button — the only
// way is the user manually tapping Share > Add to Home Screen. This overlay
// can't do that step for them, but it puts the instructions front and
// centre at the moment they're most likely to act on it: right after their
// first successful sign-in, rather than a passive banner they might miss
// under the phone's own "Save Password" prompt.
export function IosAddToHomeScreenOverlay() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(FLAG_KEY) === "true") {
        sessionStorage.removeItem(FLAG_KEY);
        setVisible(true);
      }
    } catch {
      // sessionStorage unavailable (private mode edge cases) — just skip
    }
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,0.7)" }}>
      <div className="w-full max-w-sm rounded-3xl p-6 shadow-2xl" style={{ background: "#ffffff" }}>
        <div className="flex items-start justify-between mb-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
            style={{ background: "rgba(34,197,94,0.12)" }}>
            🏇
          </div>
          <button onClick={() => setVisible(false)} className="text-slate-300 hover:text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>
        <h2 className="text-lg font-black text-slate-900 mb-1">You&apos;re in! 🎉</h2>
        <p className="text-sm text-slate-500 mb-5">
          Add Derby Day to your home screen for quick access next time — just like a real app.
        </p>
        <div className="space-y-3 mb-5">
          <div className="flex items-center gap-3 text-sm text-slate-700">
            <span className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs flex-shrink-0">1</span>
            <span>Tap the <Share className="w-4 h-4 inline mx-1" /> Share button below</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-700">
            <span className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs flex-shrink-0">2</span>
            <span>Scroll down and tap &quot;Add to Home Screen&quot;</span>
          </div>
        </div>
        <button onClick={() => setVisible(false)}
          className="w-full h-12 rounded-xl text-white font-bold text-sm"
          style={{ background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)" }}>
          Got it
        </button>
      </div>
    </div>
  );
}
