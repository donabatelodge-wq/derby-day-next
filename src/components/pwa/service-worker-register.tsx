"use client";

import { useEffect } from "react";

// Registers a tiny do-nothing service worker so browsers treat the site as
// installable. It caches nothing and changes nothing about how pages load.
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  return null;
}
