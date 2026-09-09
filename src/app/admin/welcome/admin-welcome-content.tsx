"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Save } from "lucide-react";

const DEFAULT_CONTENT = {
  title: "Welcome to Derby Day",
  subtitle: "Your ultimate Horse Racing and Football experience",
  show_title: true,
  show_subtitle: true,

  show_info_button_1: false,
  info_button_1_label: "ℹ️ App Info",
  info_button_1_color: "#facc15",

  show_info_button_2: false,
  info_button_2_label: "📋 Competition Rules",
  info_button_2_color: "#3b82f6",

  show_how_it_works_button: false,
  show_race_sweep_button: false,

  show_racing_competition_button: true,
  button_racing_competition_label: "Start A Racing Competition 🏇",

  show_lms_button: false,
  button_football_competition_label: "Start A Football Competition ⚽",

  show_join_group_button: true,
  button_join_group_label: "Join A Competition",

  show_nfl_button: false,
  button_nfl_label: "NFL Survivor Pool",

  show_football_leagues_button: false,
  button_football_label: "World Football Leagues",

  show_invite_button: false,
  button_invite_label: "Invite Friends",

  show_contact_button: false,
  button_contact_label: "Contact Us",
  contact_email: "",
};

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      className={`flex items-center justify-between w-full px-4 py-3 rounded-xl border-2 text-left transition-all ${checked ? "border-green-400 bg-green-50" : "border-slate-200 bg-white"}`}>
      <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{label}</span>
      <span className={`w-11 h-6 rounded-full flex items-center px-0.5 flex-shrink-0 transition-colors ${checked ? "bg-green-500 justify-end" : "bg-slate-300 justify-start"}`}>
        <span className="w-5 h-5 rounded-full bg-white shadow" />
      </span>
    </button>
  );
}

function ButtonSection({ title, showKey, form, setForm, labelKey, colorKey, emailKey, staticNote }: {
  title: string; showKey: string; form: any; setForm: (f: any) => void;
  labelKey?: string; colorKey?: string; emailKey?: string; staticNote?: string;
}) {
  return (
    <div className="rounded-2xl border p-4 space-y-3" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
      <ToggleRow label={title} checked={!!form[showKey]} onChange={v => setForm({ ...form, [showKey]: v })} />
      {staticNote && (
        <p className="text-xs px-1" style={{ color: "var(--text-muted)" }}>{staticNote}</p>
      )}
      {labelKey && (
        <div>
          <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-muted)" }}>Button label</label>
          <input value={form[labelKey] || ""} onChange={e => setForm({ ...form, [labelKey]: e.target.value })}
            className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm" />
        </div>
      )}
      {colorKey && (
        <div>
          <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-muted)" }}>Button color</label>
          <div className="flex items-center gap-2">
            <input type="color" value={form[colorKey] || "#22c55e"} onChange={e => setForm({ ...form, [colorKey]: e.target.value })}
              className="w-10 h-10 rounded-lg border border-slate-200" />
            <input value={form[colorKey] || ""} onChange={e => setForm({ ...form, [colorKey]: e.target.value })}
              className="flex-1 h-10 rounded-xl border border-slate-200 px-3 text-sm font-mono" />
          </div>
        </div>
      )}
      {emailKey && (
        <div>
          <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-muted)" }}>Contact email</label>
          <input type="email" value={form[emailKey] || ""} onChange={e => setForm({ ...form, [emailKey]: e.target.value })}
            placeholder="you@example.com"
            className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm" />
        </div>
      )}
    </div>
  );
}

export default function AdminWelcomeContent() {
  const router = useRouter();
  const supabase = createClient();

  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rowId, setRowId] = useState<string | null>(null);
  const [form, setForm] = useState<any>(DEFAULT_CONTENT);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      if (profile?.role !== "admin") { router.push("/"); return; }
      setIsAdmin(true);

      const { data } = await supabase.from("welcome_content").select("*").limit(1).maybeSingle();
      if (data) {
        setRowId(data.id);
        setForm({ ...DEFAULT_CONTENT, ...data });
      }
      setLoading(false);
    };
    init();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const payload = { ...form };
    delete payload.id;

    const { error } = rowId
      ? await supabase.from("welcome_content").update(payload).eq("id", rowId)
      : await supabase.from("welcome_content").insert(payload).select().single().then(res => {
          if (res.data) setRowId(res.data.id);
          return res;
        });

    setSaving(false);
    if (error) { toast.error("Failed to save."); return; }
    toast.success("Welcome page updated!");
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
          <h1 className="text-2xl font-bold mt-0.5" style={{ color: "var(--text-primary)" }}>Welcome Page</h1>
        </div>

        <div className="rounded-2xl border p-4 space-y-3" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
          <ToggleRow label="Show title" checked={!!form.show_title} onChange={v => setForm({ ...form, show_title: v })} />
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-muted)" }}>Title</label>
            <input value={form.title || ""} onChange={e => setForm({ ...form, title: e.target.value })}
              className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm" />
          </div>
          <ToggleRow label="Show subtitle" checked={!!form.show_subtitle} onChange={v => setForm({ ...form, show_subtitle: v })} />
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-muted)" }}>Subtitle</label>
            <input value={form.subtitle || ""} onChange={e => setForm({ ...form, subtitle: e.target.value })}
              className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm" />
          </div>
        </div>

        <p className="text-xs font-semibold uppercase tracking-widest px-1" style={{ color: "var(--text-muted)" }}>Buttons</p>

        <ButtonSection title="Start A Racing Competition" showKey="show_racing_competition_button"
          labelKey="button_racing_competition_label" form={form} setForm={setForm} />

        <ButtonSection title="Start A Football Competition" showKey="show_lms_button"
          labelKey="button_football_competition_label" form={form} setForm={setForm} />

        <ButtonSection title="Join A Competition" showKey="show_join_group_button"
          labelKey="button_join_group_label" form={form} setForm={setForm} />

        <ButtonSection title="Info Button 1" showKey="show_info_button_1"
          labelKey="info_button_1_label" colorKey="info_button_1_color" form={form} setForm={setForm} />

        <ButtonSection title="Info Button 2" showKey="show_info_button_2"
          labelKey="info_button_2_label" colorKey="info_button_2_color" form={form} setForm={setForm} />

        <ButtonSection title="How To Start A Racing Competition" showKey="show_how_it_works_button"
          form={form} setForm={setForm}
          staticNote="Label is fixed in code: “How To Start A Racing Competition”." />

        <ButtonSection title="Do A Race Sweep" showKey="show_race_sweep_button"
          form={form} setForm={setForm}
          staticNote="Label is fixed in code: “Do A Race Sweep 🐴”. Links to /race-sweep." />

        <ButtonSection title="NFL Survivor Pool" showKey="show_nfl_button"
          labelKey="button_nfl_label" form={form} setForm={setForm} />

        <ButtonSection title="World Football Leagues" showKey="show_football_leagues_button"
          labelKey="button_football_label" form={form} setForm={setForm} />

        <ButtonSection title="Invite Friends" showKey="show_invite_button"
          labelKey="button_invite_label" form={form} setForm={setForm} />

        <ButtonSection title="Contact Us" showKey="show_contact_button"
          labelKey="button_contact_label" emailKey="contact_email" form={form} setForm={setForm} />

      </div>

      <div className="fixed left-0 right-0 px-4 pt-3 pb-3 bg-white border-t border-slate-100 z-40"
        style={{ bottom: "calc(var(--bottom-nav-height, 4rem) + var(--safe-bottom, 0px))" }}>
        <div className="max-w-2xl mx-auto">
          <button onClick={handleSave} disabled={saving}
            className="w-full h-14 rounded-2xl text-white font-black text-base flex items-center justify-center gap-2 disabled:opacity-40 transition-all active:scale-95"
            style={{ background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)" }}>
            <Save className="w-5 h-5" />
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
