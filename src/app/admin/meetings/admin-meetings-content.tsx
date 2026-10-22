"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";
import { Plus, Trash2, Calendar, Clock, Settings, Trophy, Pencil } from "lucide-react";
import Link from "next/link";

const STATUS_CONFIG = {
  upcoming:  { label: "Upcoming",         color: "text-amber-600 bg-amber-50 border-amber-200" },
  open:      { label: "Open for entries", color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  closed:    { label: "Closed",           color: "text-slate-500 bg-slate-50 border-slate-200" },
  completed: { label: "Completed",        color: "text-indigo-600 bg-indigo-50 border-indigo-200" },
};

const EMPTY_FORM = {
  name: "", date: "", venue: "", status: "upcoming",
  points_1st: 3, points_2nd: 2, points_3rd: 1,
  best_chance_multiplier_1st: 2, best_chance_multiplier_2nd: 2, best_chance_multiplier_3rd: 2,
  close_at: "",
};

export default function AdminMeetingsContent() {
  const router = useRouter();
  const supabase = createClient();

  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editingPoints, setEditingPoints] = useState<string | null>(null);
  const [pointsForm, setPointsForm] = useState<any>({});
  const [editingCloseAt, setEditingCloseAt] = useState<string | null>(null);
  const [closeAtValue, setCloseAtValue] = useState("");
  const [editingDetails, setEditingDetails] = useState<string | null>(null);
  const [detailsForm, setDetailsForm] = useState({ name: "", date: "", venue: "" });
  const [savingDetails, setSavingDetails] = useState(false);
  const [lmsCompetitions, setLmsCompetitions] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("meetings");

  const load = useCallback(async () => {
    const { data } = await supabase.from("meetings").select("*").order("sort_order").order("date");
    setMeetings(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      if (profile?.role !== "admin") { router.push("/"); return; }
      setIsAdmin(true);
      await load();
    };
    init();
  }, []);

  useEffect(() => {
    if (activeTab === "lmsresults") {
      supabase.from("lms_competitions").select("*").eq("status", "active")
        .then(({ data }) => setLmsCompetitions(data ?? []));
    }
  }, [activeTab]);

  const handleCreate = async () => {
    setSaving(true);
    const payload: any = { ...form };
    if (payload.close_at) payload.close_at = new Date(payload.close_at).toISOString();
    else delete payload.close_at;
    const { error } = await supabase.from("meetings").insert(payload);
    if (error) { toast.error("Failed to create meeting."); setSaving(false); return; }
    setForm(EMPTY_FORM);
    setShowForm(false);
    await load();
    setSaving(false);
    toast.success("Meeting created!");
  };

  const updateStatus = async (id: string, status: string) => {
    setMeetings(prev => prev.map(m => m.id === id ? { ...m, status } : m));
    await supabase.from("meetings").update({ status }).eq("id", id);
    toast.success("Status updated!");
  };

  const startEditDetails = (m: any) => {
    setEditingDetails(m.id);
    setDetailsForm({
      name: m.name || "",
      date: m.date ? String(m.date).slice(0, 10) : "",
      venue: m.venue || "",
    });
  };

  const handleSaveDetails = async (id: string) => {
    if (!detailsForm.name.trim() || !detailsForm.date) {
      toast.error("Name and date are required.");
      return;
    }
    setSavingDetails(true);
    const { error } = await supabase.from("meetings").update({
      name: detailsForm.name.trim(),
      date: detailsForm.date,
      venue: detailsForm.venue.trim(),
    }).eq("id", id);
    setSavingDetails(false);
    if (error) { toast.error("Failed to save changes."); return; }
    setEditingDetails(null);
    await load();
    toast.success("Meeting updated!");
  };

  const handleSavePoints = async (id: string) => {
    await supabase.from("meetings").update({
      points_1st: Number(pointsForm.points_1st),
      points_2nd: Number(pointsForm.points_2nd),
      points_3rd: Number(pointsForm.points_3rd),
      best_chance_multiplier_1st: Number(pointsForm.best_chance_multiplier_1st),
      best_chance_multiplier_2nd: Number(pointsForm.best_chance_multiplier_2nd),
      best_chance_multiplier_3rd: Number(pointsForm.best_chance_multiplier_3rd),
    }).eq("id", id);
    setEditingPoints(null);
    await load();
    toast.success("Points updated!");
  };

  const handleSaveCloseAt = async (id: string) => {
    await supabase.from("meetings").update({
      close_at: closeAtValue ? new Date(closeAtValue).toISOString() : null
    }).eq("id", id);
    setEditingCloseAt(null);
    await load();
    toast.success("Auto-close time saved!");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this meeting and all its races?")) return;
    setDeleting(id);
    await supabase.from("races").delete().eq("meeting_id", id);
    await supabase.from("meetings").delete().eq("id", id);
    await load();
    setDeleting(null);
    toast.success("Meeting deleted.");
  };

  if (loading || !isAdmin) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
      <div className="w-8 h-8 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const tabs = [
    { id: "meetings", label: "Meetings" },
    { id: "lmsresults", label: "LMS Results" },
  ];

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <div className="max-w-2xl mx-auto px-4 py-8">

        <div className="flex items-center justify-between mb-6">
          <div>
            <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: "var(--text-muted)" }}>Admin</span>
            <h1 className="text-2xl font-bold mt-0.5" style={{ color: "var(--text-primary)" }}>Meetings</h1>
          </div>
          {activeTab === "meetings" && (
            <button onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-900 hover:bg-slate-700 text-white text-sm font-semibold">
              <Plus className="w-4 h-4" /> New Meeting
            </button>
          )}
        </div>

        <div className="flex gap-1 mb-6 p-1 rounded-xl border" style={{ background: "var(--bg)", borderColor: "var(--border)" }}>
          {tabs.map(({ id, label }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${activeTab === id ? "bg-white shadow-sm" : ""}`}
              style={{ color: activeTab === id ? "var(--text-primary)" : "var(--text-muted)" }}>
              {label}
            </button>
          ))}
        </div>

        {activeTab === "lmsresults" && (
          <div className="space-y-3">
            {lmsCompetitions.length === 0 ? (
              <div className="text-center py-16" style={{ color: "var(--text-muted)" }}>
                <Trophy className="w-8 h-8 mx-auto mb-3 opacity-40" />
                <p>No active LMS competitions found.</p>
              </div>
            ) : (
              lmsCompetitions.map(comp => (
                <div key={comp.id} className="rounded-3xl p-4 border flex items-center justify-between gap-3"
                  style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
                  <div>
                    <p className="font-semibold" style={{ color: "var(--text-primary)" }}>{comp.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Week {comp.current_week}</p>
                  </div>
                  <Link href={`/admin/lms-results?competitionId=${comp.id}&groupId=${comp.group_id}`}
                    className="flex-shrink-0 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
                    Enter Results
                  </Link>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "meetings" && (
          <div>
            {showForm && (
              <div className="rounded-3xl p-5 border mb-5 space-y-4" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
                <h2 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>New Meeting</h2>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-muted)" }}>Meeting Name *</label>
                  <input placeholder="e.g. Glorious Goodwood Day 1" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                    className="w-full h-12 rounded-xl border border-slate-200 px-3 text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-muted)" }}>Date *</label>
                    <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                      className="w-full h-12 rounded-xl border border-slate-200 px-3 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-muted)" }}>Status</label>
                    <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                      className="w-full h-12 rounded-xl border border-slate-200 px-3 text-sm bg-white">
                      <option value="upcoming">Upcoming</option>
