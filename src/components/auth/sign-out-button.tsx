"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function SignOutButton() {
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <button
      onClick={handleSignOut}
      className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
      style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" }}
    >
      Sign out
    </button>
  );
}
