import Stripe from "stripe";

// Server-only. Never import this from a "use client" file — the secret key
// must never reach the browser.
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
