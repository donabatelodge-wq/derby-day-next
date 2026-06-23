"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Menu, X, Home, Users, Settings, LogOut, ChevronLeft } from "lucide-react";

const ROOT_PATHS = new Set(["/", "/my-competitions", "/admin/meetings", "/admin/groups"]);

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const hidden = ["/login", "/signup", "/invite"].some(p => pathname.startsWith(p));

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("profiles").select("role").eq("id", user.id).single()
        .then(({ data }) => setIsAdmin(data?.role === "admin"));
    });
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    if (menuOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  if (hidden) return null;

  const isRoot = ROOT_PATHS.has(pathname);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const menuItems = [
    { label: "Welcome", href: "/", icon: Home },
    { label: "My Competitions", href: "/my-competitions", icon: Users },
    ...(isAdmin ? [
      { label: "Admin Meetings", href: "/admin/meetings", icon: Settings },
    ] : []),
  ];

  return (
    <header className="sticky top-0 z-50 flex items-center h-14 px-4"
      style={{
        background: "var(--bg-card)",
        borderBottom: "1px solid var(--border)",
        paddingTop: "env(safe-area-inset-top)",
      }}>
      <div className="w-full max-w-2xl mx-auto flex items-center justify-between">
        {isRoot ? (
          <span className="text-xl font-black tracking-tight" style={{ color: "var(--text-primary)" }}>
            🏇 Derby Day
          </span>
        ) : (
          <button onClick={() => router.back()}
            className="flex items-center gap-1 text-sm font-medium"
            style={{ color: "var(--text-secondary)" }}>
            <ChevronLeft className="w-5 h-5" />
            Back
          </button>
        )}

        <div className="relative" ref={menuRef}>
          <button onClick={() => setMenuOpen(o => !o)}
            className="w-9 h-9 flex items-center justify-center rounded-xl transition-colors"
            style={{ background: "var(--bg-card)", border: "1.5px solid var(--border)", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
            {menuOpen
              ? <X className="w-5 h-5" style={{ color: "var(--text-primary)" }} />
              : <Menu className="w-5 h-5" style={{ color: "var(--text-primary)" }} />}
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-11 w-52 rounded-2xl shadow-xl border overflow-hidden z-[100]"
              style={{ background: "#ffffff", borderColor: "#e2e8f0" }}>
              <div className="py-1">
                {menuItems.map(({ label, href, icon: Icon }) => (
                  <button key={href} onClick={() => { router.push(href); setMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors text-left">
                    <Icon className="w-4 h-4 text-slate-400" />
                    {label}
                  </button>
                ))}
                <div className="border-t border-slate-100 mt-1 pt-1">
                  <button onClick={() => { handleSignOut(); setMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors text-left">
                    <LogOut className="w-4 h-4 text-slate-400" />
                    Sign out
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
