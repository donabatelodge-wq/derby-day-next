import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

// Tells the client whether payments are switched on. Returns only a boolean,
// read the same way the checkout route reads it.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const service = createServiceClient();
    const { data } = await service
      .from("app_settings").select("value").eq("key", "payments_enabled").maybeSingle();
    return NextResponse.json({ enabled: data?.value !== "false" });
  } catch {
    // If anything goes wrong, behave as "payments on" so no false FREE banner shows.
    return NextResponse.json({ enabled: true });
  }
}
