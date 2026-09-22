import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Service-role client: bypasses Row Level Security entirely. Use ONLY in
// server-only code (API routes, webhooks) that has already independently
// verified who's calling and what they're allowed to do — this client trusts
// the caller completely. Never import from a "use client" file, never send
// the underlying key to the browser, and never use it as a shortcut around
// an RLS check you haven't actually done in code.
export function createServiceClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  }
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
