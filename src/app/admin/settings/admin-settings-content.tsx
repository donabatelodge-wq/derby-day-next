"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";

export default function AdminSettingsContent() {
  const router = useRouter();
  const supabase = createClient();

  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rowExists, setRowExists] = useState(false);
  const [paymentsEnabled, setPaymentsEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      if (profile?.role !== "admin") { router.push("/"); return; }
      setIsAdmin(true);

      const { data } = await supabase.from("app_settings").select("value").eq("key", "payments_enabled").maybeSingle();
      if (data) { setRowExists(true); setPaymentsEnabled(data.value !== "false"); }
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
    if (error) { toast.error("Failed to update."); return; }
    setRowExists(true);
    setPaymentsEnabled(next);
    toast.success(next ? "Payments are back on." : "Payments are now off — test mode.");
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
        </div>

        <div className="rounded-3xl border p-5 space-y-4" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-base" style={{ color: "var(--text-primary)" }}>Require payment</p>
              <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
                Creating a group and upgrading the player limit go through Stripe.
              </p>
            </div>
            <button onClick={handleToggle} disabled={saving}
              className={`w-14 h-8 rounded-full flex items-center px-1 flex-shrink-0 transition-colors disabled:opacity-50 ${paymentsEnabled ? "bg-green-500 justify-end" : "bg-slate-300 justify-start"}`}>
              <span className="w-6 h-6 rounded-full bg-white shadow" />
            </button>
          </div>

          {!paymentsEnabled && (
            <div className="flex items-start gap-2 rounded-2xl p-3 bg-amber-50 border border-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                Payments are off. Every group creation and player-limit upgrade is applied immediately with no Stripe charge — this is for internal testing only. Turn this back on before real users start creating groups.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
