"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Plus, Trash2, Check, Trophy, ChevronDown, ChevronUp,
  Pencil, AlertCircle, X, Zap, RefreshCw, Lock
} from "lucide-react";

const EMPTY_FORM = {
  race_number: "", race_name: "", race_type: "Thoroughbred",
  distance: "", race_time: "", horses: [{ number: 1, name: "", jockey: "", trainer: "" }]
};

export default function AdminRacesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const meetingId = searchParams.get("meetingId");
  const supabase = createClient();

  const [meeting, setMeeting] = useState<any>(null);
  const [races, setRaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [results, setResults] = useState<Record<string, any>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [savingResult, setSavingResult] = useState<Record<string, boolean>>({});
  const [editingRace, setEditingRace] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingRace, setDeletingRace] = useState<string | null>(null);
  const [nonRunnerPanel, setNonRunnerPanel] = useState<any>(null);
  const [nonRunnerReplacement, setNonRunnerReplacement] = useState("");
  const [nonRunnerEntries, setNonRunnerEntries] = useState<any[]>([]);
  const [applyingNonRunner, setApplyingNonRunner] = useState(false);
  const [apiCourse, setApiCourse] = useState("");
  const [apiDate, setApiDate] = useState(new Date().toISOString().slice(0, 10));
  const [showApiImport, setShowApiImport] = useState(false);
  const [apiImporting, setApiImporting] = useState(false);
  const [apiImportResult, setApiImportResult] = useState<any>(null);
  const [apiImportError, setApiImportError] = useState("");
  const [fetchingResults, setFetchingResults] = useState(false);
  const [fetchResultsMsg, setFetchResultsMsg] = useState("");
  const [joinDeadline, setJoinDeadline] = useState("");
  const [editingDeadline, setEditingDeadline] = useState(false);
  const [savingDeadline, setSavingDeadline] = useState(false);

  const load = useCallback(async () => {
    if (!meetingId) return;
    const [{ data: m }, { data: raceList }] = await Promise.all([
      supabase.from("meetings").select("*").eq("id", meetingId).single(),
      supabase.from("races").select("*").eq("meeting_id", meetingId).order("race_number"),
    ]);
    setMeeting(m);
    setRaces(raceList ?? []);
    if (m?.close_at) setJoinDeadline(format(new Date(m.close_at), "yyyy-MM-dd'T'HH:mm"));
    const r: Record<string, any> = {};
    (raceList ?? []).forEach((race: any) => {
      r[race.id] = { result_1st: race.result_1st || "", result_2nd: race.result_2nd || "", result_3rd: race.result_3rd || "" };
    });
    setResults(r);
    setLoading(false);
  }, [meetingId]);

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
  }, [meetingId]);

  const recalcPoints = async (raceList: any[]) => {
    const { data: entries } = await supabase.from("entries").select("*").eq("meeting_id", meetingId!);
    if (!entries || !meeting) return;
    const p1 = meeting.points_1st ?? 3;
    const p2 = meeting.points_2nd ?? 2;
    const p3 = meeting.points_3rd ?? 1;
    const bc1 = meeting.best_chance_multiplier_1st ?? 2;
    const bc2 = meeting.best_chance_multiplier_2nd ?? 2;
    const bc3 = meeting.best_chance_multiplier_3rd ?? 2;
    const raceMap: Record<string, any> = {};
    raceList.forEach(r => { raceMap[r.id] = r; });
    for (const entry of entries) {
      let total = 0;
      const updatedSelections = (entry.selections || []).map((sel: any) => {
        const race = raceMap[sel.race_id];
        if (!race || !race.result_entered) return sel;
        let pts = 0; let multiplier = 1; let finish_position = null;
        if      (sel.horse_name === race.result_1st) { pts = p1; multiplier = bc1; finish_position = 1; }
        else if (sel.horse_name === race.result_2nd) { pts = p2; multiplier = bc2; finish_position = 2; }
        else if (sel.horse_name === race.result_3rd) { pts = p3; multiplier = bc3; finish_position = 3; }
        if (sel.is_best_chance) pts *= multiplier;
        total += pts;
        return { ...sel, finish_position };
      });
      await supabase.from("entries").update({ selections: updatedSelections, total_points: total }).eq("id", entry.id);
    }
  };

  const handleSaveResult = async (raceId: string) => {
    setSavingResult(s => ({ ...s, [raceId]: true }));
    const r = results[raceId];
    await supabase.from("races").update({ ...r, result_entered: true }).eq("id", raceId);
    const { data: raceList } = await supabase.from("races").select("*").eq("meeting_id", meetingId!);
    await recalcPoints(raceList ?? []);
    await load();
    toast.success("Result saved and scores updated!");
    setSavingResult(s => ({ ...s, [raceId]: false }));
  };

  const handleSaveJoinDeadline = async () => {
    setSavingDeadline(true);
    await supabase.from("meetings").update({ close_at: joinDeadline ? new Date(joinDeadline).toISOString() : null }).eq("id", meetingId!);
    setEditingDeadline(false);
    setSavingDeadline(false);
    toast.success("Join deadline saved.");
    load();
  };

  const handleCreateRace = async () => {
    setSaving(true);
    await supabase.from("races").insert({
      meeting_id: meetingId,
      race_number: Number(form.race_number),
      race_name: form.race_name,
      race_type: form.race_type,
      distance: form.distance,
      race_time: form.race_time,
      horses: form.horses.filter(h => h.name.trim()),
      result_entered: false,
    });
    setForm(EMPTY_FORM);
    setShowForm(false);
    await load();
    setSaving(false);
    toast.success("Race created!");
  };

  const handleSaveEdit = async (raceId: string) => {
    setSavingEdit(true);
    await supabase.from("races").update({
      race_number: Number(editForm.race_number),
      race_name: editForm.race_name,
      race_type: editForm.race_type,
      distance: editForm.distance,
      horses: editForm.horses.filter((h: any) => h.name?.trim()),
    }).eq("id", raceId);
    setEditingRace(null);
    await load();
    setSavingEdit(false);
    toast.success("Race updated!");
  };

  const handleDeleteRace = async (raceId: string) => {
    setDeletingRace(raceId);
    const { data: entries } = await supabase.from("entries").select("*").eq("meeting_id", meetingId!);
    for (const entry of entries ?? []) {
      const selections = (entry.selections || []).filter((s: any) => s.race_id !== raceId);
      await supabase.from("entries").update({ selections }).eq("id", entry.id);
    }
    await supabase.from("races").delete().eq("id", raceId);
    const { data: raceList } = await supabase.from("races").select("*").eq("meeting_id", meetingId!);
    await recalcPoints(raceList ?? []);
    await load();
    setDeletingRace(null);
    toast.success("Race deleted.");
  };

  const openNonRunnerPanel = async (raceId: string, horseName: string) => {
    const { data: entries } = await supabase.from("entries").select("*").eq("meeting_id", meetingId!);
    const affected = (entries ?? []).filter((e: any) => (e.selections || []).some((s: any) => s.race_id === raceId && s.horse_name === horseName));
    setNonRunnerEntries(affected);
    setNonRunnerPanel({ raceId, horseName });
    setNonRunnerReplacement("");
  };

  const handleApplyNonRunner = async () => {
    setApplyingNonRunner(true);
    const { raceId, horseName } = nonRunnerPanel;
    for (const entry of nonRunnerEntries) {
      const selections = (entry.selections || []).map((s: any) =>
        s.race_id === raceId && s.horse_name === horseName ? { ...s, horse_name: nonRunnerReplacement } : s
      );
      await supabase.from("entries").update({ selections }).eq("id", entry.id);
    }
    const { data: raceList } = await supabase.from("races").select("*").eq("meeting_id", meetingId!);
    await recalcPoints(raceList ?? []);
    setNonRunnerPanel(null);
    await load();
    setApplyingNonRunner(false);
    toast.success("Non-runner replacement applied!");
  };

  const handleApiImport = async () => {
    if (!apiCourse.trim()) { setApiImportError("Please enter a course name."); return; }
    setApiImporting(true);
    setApiImportError("");
    setApiImportResult(null);
    try {
      const username = prompt("Racing API Username:");
      const password = prompt("Racing API Password:");
      if (!username || !password) { setApiImporting(false); return; }
      const basicAuth = "Basic " + btoa(`${username}:${password}`);
      const res = await fetch(`https://api.theracingapi.com/v1/racecards/standard?date=${apiDate}`, { headers: { Authorization: basicAuth } });
      if (!res.ok) { setApiImportError(`Racing API error: ${res.status}`); setApiImporting(false); return; }
      const data = await res.json();
      const allRaces = data.racecards || [];
      const courseRaces = allRaces.filter((r: any) => r.course.toLowerCase().startsWith(apiCourse.toLowerCase().trim()));
      if (courseRaces.length === 0) {
        setApiImportError(`No races found for "${apiCourse}". Available: ${[...new Set(allRaces.map((r: any) => r.course))].join(", ")}`);
        setApiImporting(false); return;
      }
      await supabase.from("races").delete().eq("meeting_id", meetingId!);
      const created = [];
      for (let i = 0; i < courseRaces.length; i++) {
        const r = courseRaces[i];
        const horses = (r.runners || []).map((runner: any) => ({
          number: Number(runner.number) || (i + 1),
          name: runner.horse, jockey: runner.jockey || "", trainer: runner.trainer || "",
        }));
        await supabase.from("races").insert({
          meeting_id: meetingId, race_number: i + 1,
          race_name: r.race_name || `Race ${i + 1}`,
          race_time: r.off_time || "", distance: r.distance_f ? `${r.distance_f}f` : "",
          horses, result_entered: false,
        });
        created.push({ race_number: i + 1, race_name: r.race_name, runners: horses.length });
      }
      setApiImportResult({ racesImported: created.length, course: apiCourse });
      toast.success(`Imported ${created.length} races!`);
      setShowApiImport(false);
      await load();
    } catch (e: any) {
      setApiImportError(e.message || "Import failed.");
    }
    setApiImporting(false);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
      <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <div className="max-w-2xl mx-auto px-4 py-8">

        <div className="mb-6">
          <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: "var(--text-muted)" }}>Admin · Races</span>
          <h1 className="text-2xl font-bold mt-0.5" style={{ color: "var(--text-primary)" }}>{meeting?.name || "Meeting"}</h1>
          {meeting?.date && <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>{format(new Date(meeting.date), "EEEE, d MMMM yyyy")}</p>}
        </div>

        {/* Join Deadline */}
        <div className="rounded-2xl p-5 border mb-5" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2 mb-3">
            <Lock className="w-4 h-4 text-amber-500" />
            <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Player Join Deadline</p>
          </div>
          <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
            After this time, players can no longer join. Leave blank for auto 30-min-before-first-race deadline.
          </p>
          {editingDeadline ? (
            <div className="flex items-center gap-2">
              <input type="datetime-local" value={joinDeadline} onChange={e => setJoinDeadline(e.target.value)}
                className="flex-1 rounded-xl border border-slate-200 h-9 text-sm px-3" />
              <button onClick={handleSaveJoinDeadline} disabled={savingDeadline}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold disabled:opacity-50">
                {savingDeadline ? "Saving..." : "Save"}
              </button>
              <button onClick={() => setEditingDeadline(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600">Cancel</button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <p className="text-sm flex-1" style={{ color: meeting?.close_at ? "var(--text-primary)" : "var(--text-muted)" }}>
                {meeting?.close_at
                  ? `🔒 Closes: ${format(new Date(meeting.close_at), "d MMM yyyy, h:mm a")}`
                  : "No manual deadline set (auto: 30 mins before first race)"}
              </p>
              <button onClick={() => setEditingDeadline(true)} className="text-xs font-semibold text-amber-500 hover:text-amber-600">
                {meeting?.close_at ? "Edit" : "Set deadline"}
              </button>
            </div>
          )}
        </div>

        {/* Racing API Import */}
        <div className="rounded-2xl p-5 border mb-5" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-blue-500" />
              <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Import from Racing API</p>
            </div>
            <button onClick={() => { setShowApiImport(!showApiImport); setApiImportError(""); setApiImportResult(null); }}
              className="text-xs font-semibold text-blue-500 hover:text-blue-600">
              {showApiImport ? "Cancel" : "Import runners"}
            </button>
          </div>
          <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
            Automatically fetch today&apos;s runners from The Racing API. Replaces any existing races for this meeting.
          </p>
          {showApiImport && (
            <div className="space-y-3 pt-2 border-t" style={{ borderColor: "var(--border)" }}>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-muted)" }}>Course name</label>
                  <input placeholder="e.g. Curragh, Tramore" value={apiCourse} onChange={e => setApiCourse(e.target.value)}
                    className="w-full h-9 rounded-xl border border-slate-200 px-3 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-muted)" }}>Date</label>
                  <input type="date" value={apiDate} onChange={e => setApiDate(e.target.value)}
                    className="w-full h-9 rounded-xl border border-slate-200 px-3 text-sm" />
                </div>
              </div>
              {apiImportError && <p className="text-xs text-red-500 rounded-lg bg-red-50 px-3 py-2">{apiImportError}</p>}
              {apiImportResult && <p className="text-xs text-emerald-600 rounded-lg bg-emerald-50 px-3 py-2">✅ {apiImportResult.racesImported} races imported from {apiImportResult.course}</p>}
              <button onClick={handleApiImport} disabled={!apiCourse.trim() || apiImporting}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
                <Zap className="w-4 h-4" />
                {apiImporting ? "Importing..." : "Import Runners from Racing API"}
              </button>
            </div>
          )}
        </div>

        {/* Auto Fetch Results */}
        <div className="rounded-2xl p-5 border mb-5" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2 mb-1">
            <RefreshCw className="w-4 h-4 text-emerald-500" />
            <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Auto-Fetch Results & Score</p>
          </div>
          <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
            Fetches official results from The Racing API and automatically recalculates all participant scores.
          </p>
          {fetchResultsMsg && (
            <p className="text-xs rounded-lg px-3 py-2 mb-3" style={{ background: "var(--bg)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
              {fetchResultsMsg}
            </p>
          )}
          <button onClick={async () => {
            setFetchingResults(true);
            setFetchResultsMsg("");
            try {
              const username = prompt("Racing API Username:");
              const password = prompt("Racing API Password:");
              if (!username || !password) { setFetchingResults(false); return; }
              const basicAuth = "Basic " + btoa(`${username}:${password}`);
              const { data: raceList } = await supabase.from("races").select("*").eq("meeting_id", meetingId!);
              let resultsApplied = 0;
              for (const race of raceList ?? []) {
                if (!race.race_time) continue;
                const res = await fetch(
                  `https://api.theracingapi.com/v1/results?date=${meeting?.date}&course=${encodeURIComponent(meeting?.venue || "")}`,
                  { headers: { Authorization: basicAuth } }
                );
                if (!res.ok) continue;
                const data = await res.json();
                const matchedRace = (data.results || []).find((r: any) => r.off_time === race.race_time);
                if (!matchedRace) continue;
                const runners = matchedRace.runners || [];
                const getPos = (pos: number) => runners.find((r: any) => r.position === String(pos))?.horse || "";
                await supabase.from("races").update({
                  result_1st: getPos(1), result_2nd: getPos(2), result_3rd: getPos(3), result_entered: true,
                }).eq("id", race.id);
                resultsApplied++;
              }
              const { data: updatedRaces } = await supabase.from("races").select("*").eq("meeting_id", meetingId!);
              await recalcPoints(updatedRaces ?? []);
              await load();
              setFetchResultsMsg(`✅ ${resultsApplied} of ${raceList?.length} races scored.`);
              toast.success(`Results applied! ${resultsApplied} races scored.`);
            } catch (e: any) {
              setFetchResultsMsg("Error: " + (e.message || "Unknown error"));
              toast.error("Failed to fetch results.");
            }
            setFetchingResults(false);
          }} disabled={fetchingResults}
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${fetchingResults ? "animate-spin" : ""}`} />
            {fetchingResults ? "Fetching Results..." : "Fetch Results & Auto-Score"}
          </button>
        </div>

        {/* Add Race */}
        <div className="flex items-center justify-between mb-4">
          <p className="font-semibold" style={{ color: "var(--text-primary)" }}>Races ({races.length})</p>
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-700 text-white text-sm font-semibold">
            <Plus className="w-4 h-4" /> Add Race Manually
          </button>
        </div>

        {showForm && (
          <div className="rounded-2xl p-5 border mb-5 space-y-4" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
            <h3 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>New Race</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-muted)" }}>Race Number</label>
                <input type="number" value={form.race_number} onChange={e => setForm(f => ({ ...f, race_number: e.target.value }))}
                  className="w-full h-9 rounded-xl border border-slate-200 px-3 text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-muted)" }}>Race Time</label>
                <input placeholder="e.g. 13:30" value={form.race_time} onChange={e => setForm(f => ({ ...f, race_time: e.target.value }))}
                  className="w-full h-9 rounded-xl border border-slate-200 px-3 text-sm" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-muted)" }}>Race Name</label>
              <input placeholder="Optional" value={form.race_name} onChange={e => setForm(f => ({ ...f, race_name: e.target.value }))}
                className="w-full h-9 rounded-xl border border-slate-200 px-3 text-sm" />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Runners</p>
              {form.horses.map((h, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input type="number" value={h.number}
                    onChange={e => { const horses = [...form.horses]; horses[i] = { ...horses[i], number: Number(e.target.value) }; setForm(f => ({ ...f, horses })); }}
                    className="w-16 rounded-xl border border-slate-200 px-2 text-sm text-center h-9" />
                  <input placeholder="Horse name" value={h.name}
                    onChange={e => { const horses = [...form.horses]; horses[i] = { ...horses[i], name: e.target.value }; setForm(f => ({ ...f, horses })); }}
                    className="flex-1 rounded-xl border border-slate-200 px-3 text-sm h-9" />
                  <button onClick={() => setForm(f => ({ ...f, horses: f.horses.filter((_, idx) => idx !== i) }))}
                    className="text-slate-300 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
              <button onClick={() => setForm(f => ({ ...f, horses: [...f.horses, { number: f.horses.length + 1, name: "", jockey: "", trainer: "" }] }))}
                className="text-sm flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                <Plus className="w-3.5 h-3.5" /> Add runner
              </button>
            </div>
            <div className="flex gap-2">
              <button onClick={handleCreateRace} disabled={!form.race_number || saving}
                className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-700 text-white text-sm font-semibold disabled:opacity-50">
                {saving ? "Saving..." : "Create Race"}
              </button>
              <button onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600">Cancel</button>
            </div>
          </div>
        )}

        {/* Race List */}
        {races.length === 0 ? (
          <div className="text-center py-16" style={{ color: "var(--text-muted)" }}>
            <Trophy className="w-8 h-8 mx-auto mb-3 opacity-40" />
            <p>No races yet. Use Racing API import above or add manually.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {races.map(race => (
              <div key={race.id} className="rounded-2xl border overflow-hidden" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
                <div className="flex items-center justify-between px-5 py-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Race {race.race_number}</span>
                      {race.race_time && <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">🕐 {race.race_time}</span>}
                      {race.result_entered && <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-600">✅ Result entered</span>}
                    </div>
                    {race.race_name && <p className="font-semibold text-sm mt-0.5 truncate" style={{ color: "var(--text-primary)" }}>{race.race_name}</p>}
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{(race.horses || []).length} runners</p>
                  </div>
                  <div className="flex items-center gap-1.5 ml-3 flex-shrink-0">
                    <button onClick={() => { setEditingRace(race.id); setEditForm({ race_number: race.race_number, race_name: race.race_name || "", race_type: race.race_type || "Thoroughbred", distance: race.distance || "", horses: race.horses ? [...race.horses] : [] }); setExpanded(e => ({ ...e, [race.id]: true })); }}
                      className="w-8 h-8 flex items-center justify-center rounded-xl border border-slate-200 hover:border-slate-300">
                      <Pencil className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                    <button onClick={() => handleDeleteRace(race.id)} disabled={deletingRace === race.id}
                      className="w-8 h-8 flex items-center justify-center rounded-xl border border-slate-200 text-slate-300 hover:text-red-400 hover:border-red-200">
                      {deletingRace === race.id
                        ? <div className="w-4 h-4 border-2 border-red-300 border-t-transparent rounded-full animate-spin" />
                        : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => setExpanded(e => ({ ...e, [race.id]: !e[race.id] }))}
                      className="w-8 h-8 flex items-center justify-center rounded-xl border border-slate-200">
                      {expanded[race.id] ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </button>
                  </div>
                </div>

                {expanded[race.id] && (
                  <div className="px-5 pb-5 border-t pt-4" style={{ borderColor: "var(--border)" }}>
                    {editingRace === race.id ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-muted)" }}>Race Number</label>
                            <input type="number" value={editForm.race_number} onChange={e => setEditForm((f: any) => ({ ...f, race_number: e.target.value }))}
                              className="w-full h-9 rounded-xl border border-slate-200 px-3 text-sm" />
                          </div>
                          <div>
                            <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-muted)" }}>Race Name</label>
                            <input value={editForm.race_name} onChange={e => setEditForm((f: any) => ({ ...f, race_name: e.target.value }))}
                              className="w-full h-9 rounded-xl border border-slate-200 px-3 text-sm" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Runners</p>
                          {editForm.horses.map((h: any, i: number) => (
                            <div key={i} className="flex gap-2 items-center">
                              <input type="number" value={h.number}
                                onChange={e => { const horses = [...editForm.horses]; horses[i] = { ...horses[i], number: Number(e.target.value) }; setEditForm((f: any) => ({ ...f, horses })); }}
                                className="w-16 rounded-xl border border-slate-200 px-2 text-sm text-center h-9" />
                              <input placeholder="Horse name" value={h.name}
                                onChange={e => { const horses = [...editForm.horses]; horses[i] = { ...horses[i], name: e.target.value }; setEditForm((f: any) => ({ ...f, horses })); }}
                                className="flex-1 rounded-xl border border-slate-200 px-3 text-sm h-9" />
                              <button onClick={() => setEditForm((f: any) => ({ ...f, horses: f.horses.filter((_: any, idx: number) => idx !== i) }))}
                                className="text-slate-300 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          ))}
                          <button onClick={() => setEditForm((f: any) => ({ ...f, horses: [...f.horses, { number: f.horses.length + 1, name: "", jockey: "", trainer: "" }] }))}
                            className="text-sm flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                            <Plus className="w-3.5 h-3.5" /> Add runner
                          </button>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleSaveEdit(race.id)} disabled={savingEdit}
                            className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-700 text-white text-sm font-semibold disabled:opacity-50">
                            {savingEdit ? "Saving..." : "Save Changes"}
                          </button>
                          <button onClick={() => setEditingRace(null)}
                            className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {(race.horses || []).length > 0 && (
                          <div className="mb-4">
                            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Runners</p>
                            <div className="space-y-1">
                              {race.horses.map((h: any) => (
                                <div key={h.name} className="text-xs rounded-lg px-3 py-2 border flex items-center gap-2" style={{ background: "var(--bg)", borderColor: "var(--border)" }}>
                                  <span className="w-5 flex-shrink-0" style={{ color: "var(--text-muted)" }}>{h.number}.</span>
                                  <div className="flex-1">
                                    <span className="font-medium" style={{ color: "var(--text-primary)" }}>{h.name}</span>
                                    {(h.jockey || h.trainer) && (
                                      <span className="ml-2" style={{ color: "var(--text-muted)" }}>
                                        {h.jockey && `J: ${h.jockey}`}{h.jockey && h.trainer && " · "}{h.trainer && `T: ${h.trainer}`}
                                      </span>
                                    )}
                                  </div>
                                  <button onClick={() => openNonRunnerPanel(race.id, h.name)}
                                    className="flex items-center gap-1 text-xs font-semibold bg-orange-100 text-orange-600 hover:bg-orange-200 border border-orange-300 rounded-lg px-2.5 py-1 flex-shrink-0">
                                    <AlertCircle className="w-3.5 h-3.5" /> Non-Runner
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="pt-4 border-t" style={{ borderColor: "var(--border)" }}>
                          <p className="text-xs font-semibold uppercase tracking-wider mb-1 flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
                            <Trophy className="w-3.5 h-3.5" /> Official Results
                            {race.result_entered && <span className="text-emerald-500 normal-case font-normal">(entered)</span>}
                          </p>
                          <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>Use Auto-Fetch above, or enter manually below.</p>
                          <div className="grid grid-cols-3 gap-2 mb-3">
                            {[
                              { field: "result_1st", label: "🥇 1st" },
                              { field: "result_2nd", label: "🥈 2nd" },
                              { field: "result_3rd", label: "🥉 3rd" }
                            ].map(({ field, label }) => (
                              <div key={field}>
                                <label className="text-xs mb-1 block font-medium" style={{ color: "var(--text-muted)" }}>{label}</label>
                                <select
                                  value={results[race.id]?.[field] || ""}
                                  onChange={e => setResults(prev => ({ ...prev, [race.id]: { ...prev[race.id], [field]: e.target.value } }))}
                                  className="w-full h-9 rounded-xl border border-slate-200 px-2 text-sm bg-white"
                                >
                                  <option value="">—</option>
                                  {(race.horses || []).map((h: any) => (
                                    <option key={h.name} value={h.name}>{h.number}. {h.name}</option>
                                  ))}
                                </select>
                              </div>
                            ))}
                          </div>
                          <button onClick={() => handleSaveResult(race.id)} disabled={!results[race.id]?.result_1st || savingResult[race.id]}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-50">
                            <Check className="w-3.5 h-3.5" />
                            {savingResult[race.id] ? "Saving..." : race.result_entered ? "Update Result" : "Save Result & Recalc"}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Non-Runner Modal */}
      {nonRunnerPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.85)" }}>
          <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl bg-white">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                  <AlertCircle className="w-4 h-4 text-orange-500" />
                </div>
                <div>
                  <p className="text-xs font-medium text-orange-500 uppercase tracking-wider">Non-Runner</p>
                  <h3 className="font-bold text-base text-slate-900">{nonRunnerPanel.horseName}</h3>
                </div>
              </div>
              <button onClick={() => setNonRunnerPanel(null)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              {nonRunnerEntries.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-sm font-medium text-slate-800">No entries have selected this horse.</p>
                  <p className="text-xs mt-1 text-slate-400">No action needed.</p>
                </div>
              ) : (
                <>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-2 text-slate-500">Affected Entries ({nonRunnerEntries.length})</p>
                    <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                      {nonRunnerEntries.map((e: any) => (
                        <div key={e.id} className="text-sm px-3 py-2 bg-slate-50 text-slate-700">{e.participant_name}</div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-2 text-slate-500">Replace With</p>
                    <select value={nonRunnerReplacement} onChange={e => setNonRunnerReplacement(e.target.value)}
                      className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm bg-white">
                      <option value="">— Select a replacement horse —</option>
                      {(races.find(r => r.id === nonRunnerPanel.raceId)?.horses || [])
                        .filter((h: any) => h.name !== nonRunnerPanel.horseName)
                        .map((h: any) => <option key={h.name} value={h.name}>{h.number}. {h.name}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleApplyNonRunner} disabled={!nonRunnerReplacement || applyingNonRunner}
                      className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold disabled:opacity-50">
                      {applyingNonRunner ? "Applying..." : "Apply Replacement"}
                    </button>
                    <button onClick={() => setNonRunnerPanel(null)}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600">Cancel</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
