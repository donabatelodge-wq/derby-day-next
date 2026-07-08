"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Home, Users, Settings } from "lucide-react";

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("profiles").select("role").eq("id", user.id).single()
        .then(({ data }) => setIsAdmin(data?.role === "admin"));
    });
  }, []);

  const hidden = ["/login", "/signup", "/invite"].some(p => pathname.startsWith(p));
  if (hidden) return null;

  const tabs = [
    { label: "Welcome", href: "/", icon: Home },
    { label: "My Competitions", href: "/my-competitions", icon: Users },
    ...(isAdmin ? [{ label: "Admin", href: "/admin/meetings", icon: Settings }] : []),
  ];

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex"
      style={{
        background: "var(--bg-card)",
        borderTop: "1px solid var(--border)",
        paddingBottom: "var(--safe-bottom)",
        paddingLeft: "var(--safe-left)",
        paddingRight: "var(--safe-right)",
      }}>
      {tabs.map(({ label, href, icon: Icon }) => {
        const active = isActive(href);
        return (
          <button key={href} onClick={() => router.push(href)}
            className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 min-h-[52px] transition-colors active:opacity-60"
            style={{ color: active ? "#22c55e" : "var(--text-muted)", background: "none", border: "none" }}>
            <Icon className="w-5 h-5" />
            <span className="text-xs font-medium">{label}</span>
            {active && <span className="w-5 h-0.5 bg-green-500 rounded-full mt-0.5" />}
          </button>
        );
      })}
    </nav>
  );
}
