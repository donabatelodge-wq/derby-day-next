"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, ChevronDown, ChevronUp, X } from "lucide-react";
import type { League, LeagueTeam } from "@/lib/types";

export default function AdminLeaguesContent() {
  const router = useRouter();
  const supabase = createClient();

  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [teamsByLeague, setTeamsByLeague] = useState<Record<string, LeagueTeam[]>>({});
  const [expanded, setExpanded] = useState<string | null>(null);

  const [showAddLeague, setShowAddLeague] = useState(false);
  const [newLeagueName, setNewLeagueName] = useState("");
  const [newLeagueCountry, setNewLeagueCountry] = useState("");
  const [savingLeague, setSavingLeague] = useState(false);

  const [newTeamName, setNewTeamName] = useState<Record<string, string>>({});
  const [savingTeam, setSavingTeam] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [{ data: leagueRows }, { data: teamRows }] = await Promise.all([
      supabase.from("leagues").select("*").order("sort_order").order("name"),
      supabase.from("league_teams").select("*").order("sort_order").order("team_name"),
    ]);
    setLeagues(leagueRows ?? []);
    const grouped: Record<string, LeagueTeam[]> = {};
    for (const t of teamRows ?? []) {
      (grouped[t.league_id] ||= []).push(t);
    }
    setTeamsByLeague(grouped);
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

  const handleAddLeague = async () => {
    if (!newLeagueName.trim()) return;
    setSavingLeague(true);
    const { error } = await supabase.from("leagues").insert({
      name: newLeagueName.trim(),
      country: newLeagueCountry.trim() || null,
      sort_order: leagues.length,
    });
    setSavingLeague(false);
    if (error) { toast.error("Failed to add league."); return; }
    setNewLeagueName(""); setNewLeagueCountry(""); setShowAddLeague(false);
    await load();
    toast.success("League added.");
  };

  const toggleActive = async (league: League) => {
    setLeagues(prev => prev.map(l => l.id === league.id ? { ...l, active: !l.active } : l));
    const { error } = await supabase.from("leagues").update({ active: !league.active }).eq("id", league.id);
    if (error) { toast.error("Failed to update."); await load(); return; }
  };

  const handleDeleteLeague = async (league: League) => {
    if (!confirm(`Delete "${league.name}" and all its teams? Groups already using it keep their existing picks, but you won't be able to create new competitions for it.`)) return;
    const { error } = await supabase.from("leagues").delete().eq("id", league.id);
    if (error) { toast.error("Failed to delete league."); return; }
    await load();
    toast.success("League deleted.");
  };

  const handleAddTeam = async (leagueId: string) => {
    const name = (newTeamName[leagueId] || "").trim();
    if (!name) return;
    setSavingTeam(leagueId);
    const existingCount = (teamsByLeague[leagueId] || []).length;
    const { error } = await supabase.from("league_teams").insert({
      league_id: leagueId, team_name: name, sort_order: existingCount,
    });
    setSavingTeam(null);
    if (error) { toast.error("Failed to add team."); return; }
    setNewTeamName(prev => ({ ...prev, [leagueId]: "" }));
    await load();
  };

  const handleDeleteTeam = async (team: LeagueTeam) => {
    const { error } = await supabase.from("league_teams").delete().eq("id", team.id);
    if (error) { toast.error("Failed to remove team."); return; }
    await load();
  };

  const handleRenameTeam = async (team: LeagueTeam, newName: string) => {
    if (!newName.trim() || newName === team.team_name) return;
    const { error } = await supabase.from("league_teams").update({ team_name: newName.trim() }).eq("id", team.id);
    if (error) { toast.error("Failed to rename team."); await load(); return; }
    await load();
  };

  if (loading || !isAdmin) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
      <div className="w-8 h-8 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen pb-40" style={{ background: "var(--bg)" }}>
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">

        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: "var(--text-muted)" }}>Admin</span>
            <h1 className="text-2xl font-bold mt-0.5" style={{ color: "var(--text-primary)" }}>Leagues &amp; Teams</h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
              Only leagues marked active appear when someone creates a Last Man Standing competition. Team lists are snapshotted into each competition when it's created, so editing a team here never changes a competition already in progress.
            </p>
          </div>
        </div>

        {leagues.length === 0 && !showAddLeague && (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <p className="text-slate-500 text-sm">No leagues configured yet.</p>
          </div>
        )}

        {leagues.map(league => {
          const teams = teamsByLeague[league.id] || [];
          const isExpanded = expanded === league.id;
          return (
            <div key={league.id} className="rounded-3xl border overflow-hidden" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
              <div className="px-5 py-4 flex items-center justify-between">
                <button onClick={() => setExpanded(isExpanded ? null : league.id)} className="flex-1 flex items-center gap-3 text-left">
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                  <div>
                    <p className="font-semibold text-base" style={{ color: "var(--text-primary)" }}>{league.name}</p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {league.country ? `${league.country} · ` : ""}{teams.length} team{teams.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </button>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => toggleActive(league)}
                    className={`text-xs px-2.5 py-1.5 rounded-full font-semibold border transition-colors ${league.active ? "bg-green-50 border-green-300 text-green-700" : "bg-slate-50 border-slate-200 text-slate-400"}`}>
                    {league.active ? "Active" : "Inactive"}
                  </button>
                  <button onClick={() => handleDeleteLeague(league)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-400 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="px-5 pb-5 pt-1 border-t" style={{ borderColor: "var(--border)" }}>
                  <div className="space-y-1.5 mt-3">
                    {teams.length === 0 && (
                      <p className="text-xs py-2" style={{ color: "var(--text-muted)" }}>No teams yet — add some below.</p>
                    )}
                    {teams.map(team => (
                      <div key={team.id} className="flex items-center gap-2">
                        <input defaultValue={team.team_name}
                          onBlur={e => handleRenameTeam(team, e.target.value)}
                          className="flex-1 h-10 rounded-lg border border-slate-200 px-3 text-sm bg-white" />
                        <button onClick={() => handleDeleteTeam(team)} className="p-2 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-400 transition-colors flex-shrink-0">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <input placeholder="Add a team..." value={newTeamName[league.id] || ""}
                      onChange={e => setNewTeamName(prev => ({ ...prev, [league.id]: e.target.value }))}
                      onKeyDown={e => e.key === "Enter" && handleAddTeam(league.id)}
                      className="flex-1 h-10 rounded-lg border border-slate-200 px-3 text-sm bg-white" />
                    <button onClick={() => handleAddTeam(league.id)} disabled={savingTeam === league.id}
                      className="h-10 px-3 rounded-lg bg-slate-900 text-white text-sm font-semibold disabled:opacity-50 flex-shrink-0">
                      Add
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {showAddLeague ? (
          <div className="rounded-3xl border p-5 space-y-3" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-muted)" }}>League name</label>
              <input value={newLeagueName} onChange={e => setNewLeagueName(e.target.value)} autoFocus
                placeholder="e.g. La Liga"
                className="w-full h-12 rounded-xl border border-slate-200 px-3 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-muted)" }}>Country (optional)</label>
              <input value={newLeagueCountry} onChange={e => setNewLeagueCountry(e.target.value)}
                placeholder="e.g. Spain"
                className="w-full h-12 rounded-xl border border-slate-200 px-3 text-sm" />
            </div>
            <div className="flex gap-2">
              <button onClick={handleAddLeague} disabled={!newLeagueName.trim() || savingLeague}
                className="flex-1 h-12 rounded-xl bg-slate-900 text-white text-sm font-semibold disabled:opacity-50">
                {savingLeague ? "Adding..." : "Add League"}
              </button>
              <button onClick={() => { setShowAddLeague(false); setNewLeagueName(""); setNewLeagueCountry(""); }}
                className="h-12 px-4 rounded-xl border border-slate-200 text-sm font-semibold text-slate-500">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowAddLeague(true)}
            className="w-full h-14 rounded-2xl border-2 border-dashed flex items-center justify-center gap-2 text-sm font-semibold transition-colors"
            style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
            <Plus className="w-4 h-4" /> Add League
          </button>
        )}

      </div>
    </div>
  );
}
