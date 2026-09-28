"use client";

// A tiny shared store (with pub/sub) for the browser's PWA "install" prompt
// event (Android/Chrome only — iOS has no equivalent API at all). The whole
// app runs as one JS bundle in the browser, so any client component that
// imports this file shares the same module-level variable — no React
// context needed just to pass one event around between pages.
//
// This has to live outside any single page's component tree because
// `beforeinstallprompt` fires once per page load whenever it fires, and we
// want to catch it no matter which page happens to be open at the time
// (login, signup, home, etc), then still have it available later when the
// user actually taps "Sign In".

type Listener = (available: boolean) => void;

let deferredPrompt: any = null;
const listeners = new Set<Listener>();

export function setDeferredInstallPrompt(e: any) {
  deferredPrompt = e;
  listeners.forEach(l => l(true));
}

export function getDeferredInstallPrompt() {
  return deferredPrompt;
}

export function clearDeferredInstallPrompt() {
  deferredPrompt = null;
  listeners.forEach(l => l(false));
}

export function subscribeInstallPromptAvailable(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
