import Stripe from "stripe";

// Server-only. Never import this from a "use client" file — the secret key
// must never reach the browser.
//
// Lazily initialized: Next.js evaluates route modules at build time to
// collect page data, so a top-level throw here would fail the build even
// when no request ever reaches this route. Deferring the check to first use
// lets the app build and deploy fine with STRIPE_SECRET_KEY unset — it only
// errors if something actually tries to call Stripe.
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
