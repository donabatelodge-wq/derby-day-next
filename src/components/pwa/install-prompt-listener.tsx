"use client";

import { useEffect } from "react";
import { setDeferredInstallPrompt } from "@/lib/install-prompt";

// Mounted once in the root layout (every page) so the browser's Android
// install prompt is captured no matter which page the user happens to be
// on when it fires — waiting until the home page mounts (the old approach)
// meant it could easily fire and be missed while the user was still on
// /login or /signup.
export function InstallPromptListener() {
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredInstallPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  return null;
}
