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
    <div className="mt-10 text-center">
      <button
        onClick={handleSignOut}
        className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
      >
        Sign out
      </button>
    </div>
  );
}
