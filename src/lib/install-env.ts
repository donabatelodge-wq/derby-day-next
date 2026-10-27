// Works out what kind of phone/browser is looking at the page, so we can show
// the right "Add to Home Screen" steps. Browser-only: call from useEffect or an
// event handler, never during server rendering.

export type StepKind = "ios" | "chrome" | "samsung" | "firefox" | "edge" | "android-other";

export type InstallEnv = {
  standalone: boolean; // already running from the home screen
  os: "ios" | "android" | "desktop";
  browser: "safari" | "chrome" | "samsung" | "firefox" | "edge" | "opera" | "other";
  inApp: boolean; // Facebook/Instagram/etc. built-in browser: can't add to home screen
  inAppName: string | null;
};

const IN_APP: { re: RegExp; name: string }[] = [
  { re: /fban|fbav|fb_iab|fbios|messenger/, name: "Facebook" },
  { re: /instagram/, name: "Instagram" },
  { re: /musical_ly|bytedancewebview|tiktok/, name: "TikTok" },
  { re: /snapchat/, name: "Snapchat" },
  { re: /twitter/, name: "X" },
  { re: /linkedinapp/, name: "LinkedIn" },
  { re: /pinterest/, name: "Pinterest" },
  { re: /line\//, name: "LINE" },
  { re: /gsa\//, name: "the Google app" },
];

export function detectInstallEnv(): InstallEnv {
  const nav = window.navigator as any;
  const ua: string = nav.userAgent || "";
  const l = ua.toLowerCase();

  const standalone =
    window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;

  const isIpadOs = nav.platform === "MacIntel" && (nav.maxTouchPoints || 0) > 1;
  const os: InstallEnv["os"] =
    /iphone|ipad|ipod/.test(l) || isIpadOs ? "ios" : /android/.test(l) ? "android" : "desktop";

  let browser: InstallEnv["browser"] = "other";
  if (/edga|edgios|edg\//.test(l)) browser = "edge";
  else if (/opr\/|opios/.test(l)) browser = "opera";
  else if (l.includes("samsungbrowser")) browser = "samsung";
  else if (/firefox|fxios/.test(l)) browser = "firefox";
  else if (/chrome|crios/.test(l)) browser = "chrome";
  else if (/safari/.test(l)) browser = "safari";

  let inApp = false;
  let inAppName: string | null = null;
  if (!standalone) {
    const hit = IN_APP.find(x => x.re.test(l));
    if (hit) {
      inApp = true;
      inAppName = hit.name;
    } else if (os === "android" && /; wv\)/.test(l)) {
      inApp = true; // Android WebView
    } else if (os === "ios" && !/safari/.test(l)) {
      inApp = true; // iPhone WebView (real browsers all include "Safari" in the UA)
    }
  }

  return { standalone, os, browser, inApp, inAppName };
}

export function stepKindFor(env: InstallEnv): StepKind | null {
  if (env.os === "ios") return "ios";
  if (env.os !== "android") return null;
  if (env.browser === "samsung") return "samsung";
  if (env.browser === "firefox") return "firefox";
  if (env.browser === "edge") return "edge";
  if (env.browser === "chrome") return "chrome";
  return "android-other";
}
