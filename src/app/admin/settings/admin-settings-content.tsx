"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { CreditCard } from "lucide-react";

export default function AdminSettingsContent() {
  const router = useRouter();
  const supabase = createClient();

  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [paymentsEnabled, setPaymentsEnabled] = useState(true);
  const [rowExists, setRowExists] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      if (profile?.role !== "admin") { router.push("/"); return; }
      setIsAdmin(true);

      const { data } = await supabase.from("app_settings").select("value").eq("key", "payments_enabled").maybeSingle();
      if (data) {
        setRowExists(true);
        setPaymentsEnabled(data.value !== "false");
      } else {
        setRowExists(false);
        setPaymentsEnabled(true);
      }
      setLoading(false);
    };
    init();
  }, []);

  const handleToggle = async () => {
    const next = !paymentsEnabled;
    setSaving(true);
    const { error } = rowExists
      ? await supabase.from("app_settings").update({ value: String(next) }).eq("key", "payments_enabled")
      : await supabase.from("app_settings").insert({ key: "payments_enabled", value: String(next) });
    setSaving(false);
    if (error) {
      toast.error("Failed to update setting.");
      return;
    }
    setRowExists(true);
    setPaymentsEnabled(next);
    toast.success(next ? "Payments are back on." : "Payments are now off — new groups activate without charging.");
  };

  if (loading || !isAdmin) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
      <div className="w-8 h-8 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen pb-40" style={{ background: "var(--bg)" }}>
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">

        <div>
          <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: "var(--text-muted)" }}>Admin</span>
          <h1 className="text-2xl font-bold mt-0.5" style={{ color: "var(--text-primary)" }}>App Settings</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Controls that affect the whole app.
          </p>
        </div>

        <div className="rounded-3xl border p-5 flex items-center justify-between gap-4" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "var(--bg)" }}>
              <CreditCard className="w-5 h-5" style={{ color: "var(--text-muted)" }} />
            </div>
            <div>
              <p className="font-semibold text-base" style={{ color: "var(--text-primary)" }}>Require payment</p>
              <p className="text-xs mt-1 max-w-xs" style={{ color: "var(--text-muted)" }}>
                When off, creating a group or buying more players activates the change immediately without going through Stripe. Use this while testing or if payments are misconfigured.
              </p>
            </div>
          </div>
          <button onClick={handleToggle} disabled={saving}
            className={`relative flex-shrink-0 w-14 h-8 rounded-full transition-colors disabled:opacity-50 ${paymentsEnabled ? "bg-green-500" : "bg-slate-300"}`}>
            <span className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-transform ${paymentsEnabled ? "translate-x-7" : "translate-x-1"}`} />
          </button>
        </div>

      </div>
    </div>
  );
}
