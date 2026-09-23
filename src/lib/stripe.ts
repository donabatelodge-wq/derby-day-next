import Stripe from "stripe";

// Server-only. Never import this from a "use client" file — the secret key
// must never reach the browser.
//
// Lazy on purpose: Next.js evaluates route modules at build time to collect
// page data, so a top-level throw here (when STRIPE_SECRET_KEY isn't set
// yet) would crash the whole build, not just a runtime request. Wrapping
// the check inside a function means it only runs when a route actually
// calls getStripe().
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return _stripe;
}
