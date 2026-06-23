"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";
import { Plus, Trash2, Calendar, Clock, Settings, Trophy } from "lucide-react";
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
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-700 text-white text-sm font-semibold">
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
                <div key={comp.id} className="rounded-2xl p-4 border flex items-center justify-between gap-3"
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
              <div className="rounded-2xl p-5 border mb-5 space-y-4" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
                <h2 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>New Meeting</h2>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-muted)" }}>Meeting Name *</label>
                  <input placeholder="e.g. Glorious Goodwood Day 1" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                    className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-muted)" }}>Date *</label>
                    <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                      className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-muted)" }}>Status</label>
                    <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                      className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm bg-white">
                      <option value="upcoming">Upcoming</option>
                      <option value="open">Open for entries</option>
                      <option value="closed">Closed</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-muted)" }}>Venue</label>
                  <input placeholder="Optional" value={form.venue} onChange={e => setForm({ ...form, venue: e.target.value })}
                    className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-muted)" }}>
                    <Clock className="w-3 h-3 inline mr-1" />Auto-close time
                  </label>
                  <input type="datetime-local" value={form.close_at} onChange={e => setForm({ ...form, close_at: e.target.value })}
                    className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium mb-2 block" style={{ color: "var(--text-muted)" }}>Points per placing</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[["🥇 1st", "points_1st"], ["🥈 2nd", "points_2nd"], ["🥉 3rd", "points_3rd"]].map(([label, key]) => (
                      <div key={key}>
                        <label className="text-xs mb-1 block" style={{ color: "var(--text-muted)" }}>{label}</label>
                        <input type="number" min="0" value={(form as any)[key]}
                          onChange={e => setForm({ ...form, [key]: Number(e.target.value) })}
                          className="w-full h-9 rounded-xl border border-slate-200 px-2 text-sm text-center" />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleCreate} disabled={!form.name || !form.date || saving}
                    className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-700 text-white text-sm font-semibold disabled:opacity-50">
                    {saving ? "Saving..." : "Create Meeting"}
                  </button>
                  <button onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600">Cancel</button>
                </div>
              </div>
            )}

            {meetings.length === 0 ? (
              <div className="text-center py-16" style={{ color: "var(--text-muted)" }}>
                <Calendar className="w-8 h-8 mx-auto mb-3 opacity-40" />
                <p>No meetings yet. Create one above.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {meetings.map(m => {
                  const cfg = STATUS_CONFIG[m.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.upcoming;
                  return (
                    <div key={m.id} className="rounded-2xl p-5 border" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${cfg.color}`}>{cfg.label}</span>
                          </div>
                          <h2 className="font-semibold" style={{ color: "var(--text-primary)" }}>{m.name}</h2>
                          <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
                            {format(new Date(m.date), "EEEE, d MMMM yyyy")}
                            {m.venue && ` · ${m.venue}`}
                          </p>

                          {editingPoints === m.id ? (
                            <div className="mt-3 space-y-2">
                              <div className="grid grid-cols-3 gap-2">
                                {[["🥇 1st", "points_1st"], ["🥈 2nd", "points_2nd"], ["🥉 3rd", "points_3rd"]].map(([label, key]) => (
                                  <div key={key}>
                                    <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>{label} pts</p>
                                    <input type="number" min="0" value={pointsForm[key]}
                                      onChange={e => setPointsForm((f: any) => ({ ...f, [key]: e.target.value }))}
                                      className="w-full h-8 rounded-lg border border-slate-200 text-center text-xs px-1" />
                                  </div>
                                ))}
                              </div>
                              <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Best Chance multiplier</p>
                              <div className="grid grid-cols-3 gap-2">
                                {[["🥇 1st", "best_chance_multiplier_1st"], ["🥈 2nd", "best_chance_multiplier_2nd"], ["🥉 3rd", "best_chance_multiplier_3rd"]].map(([label, key]) => (
                                  <div key={key}>
                                    <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>{label} ×</p>
                                    <input type="number" min="1" step="0.5" value={pointsForm[key]}
                                      onChange={e => setPointsForm((f: any) => ({ ...f, [key]: e.target.value }))}
                                      className="w-full h-8 rounded-lg border border-slate-200 text-center text-xs px-1" />
                                  </div>
                                ))}
                              </div>
                              <div className="flex gap-3 pt-1">
                                <button onClick={() => handleSavePoints(m.id)} className="text-xs font-semibold text-emerald-600">Save</button>
                                <button onClick={() => setEditingPoints(null)} className="text-xs text-slate-400">Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <button onClick={() => { setEditingPoints(m.id); setPointsForm({ points_1st: m.points_1st ?? 3, points_2nd: m.points_2nd ?? 2, points_3rd: m.points_3rd ?? 1, best_chance_multiplier_1st: m.best_chance_multiplier_1st ?? 2, best_chance_multiplier_2nd: m.best_chance_multiplier_2nd ?? 2, best_chance_multiplier_3rd: m.best_chance_multiplier_3rd ?? 2 }); }}
                              className="text-xs mt-1 hover:underline" style={{ color: "var(--text-muted)" }}>
                              🥇 {m.points_1st ?? 3}pts · 🥈 {m.points_2nd ?? 2}pts · 🥉 {m.points_3rd ?? 1}pt <span className="text-amber-500 ml-1">Edit</span>
                            </button>
                          )}

                          {editingCloseAt === m.id ? (
                            <div className="mt-2 flex items-center gap-2">
                              <input type="datetime-local" value={closeAtValue} onChange={e => setCloseAtValue(e.target.value)}
                                className="h-8 rounded-lg border border-slate-200 text-xs flex-1 px-2" />
                              <button onClick={() => handleSaveCloseAt(m.id)} className="text-xs font-semibold text-emerald-600 whitespace-nowrap">Save</button>
                              <button onClick={() => setEditingCloseAt(null)} className="text-xs text-slate-400">Cancel</button>
                            </div>
                          ) : (
                            <button onClick={() => { setEditingCloseAt(m.id); setCloseAtValue(m.close_at ? format(new Date(m.close_at), "yyyy-MM-dd'T'HH:mm") : ""); }}
                              className="text-xs mt-1 flex items-center gap-1 hover:underline" style={{ color: "var(--text-muted)" }}>
                              <Clock className="w-3 h-3" />
                              {m.close_at
                                ? <><span>Auto-close: {format(new Date(m.close_at), "d MMM, h:mm a")}</span><span className="text-amber-500 ml-1">Edit</span></>
                                : <span className="text-amber-500">Set auto-close time</span>
                              }
                            </button>
                          )}
                        </div>

                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                          <select value={m.status} onChange={e => updateStatus(m.id, e.target.value)}
                            className="h-8 rounded-lg border border-slate-200 px-2 text-xs bg-white">
                            <option value="upcoming">Upcoming</option>
                            <option value="open">Open</option>
                            <option value="closed">Closed</option>
                            <option value="completed">Completed</option>
                          </select>
                          <div className="flex gap-1.5">
                            <Link href={`/admin/races?meetingId=${m.id}`}
                              className="w-8 h-8 flex items-center justify-center rounded-xl border border-slate-200 hover:border-slate-300 transition-colors">
                              <Settings className="w-4 h-4 text-slate-400" />
                            </Link>
                            <button onClick={() => handleDelete(m.id)} disabled={deleting === m.id}
                              className="w-8 h-8 flex items-center justify-center rounded-xl border border-slate-200 text-slate-300 hover:text-red-400 hover:border-red-200 transition-colors">
                              {deleting === m.id
                                ? <div className="w-4 h-4 border-2 border-red-300 border-t-transparent rounded-full animate-spin" />
                                : <Trash2 className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
