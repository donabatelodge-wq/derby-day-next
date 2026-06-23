"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { X, ChevronRight, ChevronLeft, Check } from "lucide-react";
import { toast } from "sonner";

function generateInviteCode() {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  return letters[Math.floor(Math.random() * letters.length)] + Math.floor(1000 + Math.random() * 9000);
}

const STEP_LABELS = ["Type", "Competition", "Details", "Players", "Confirm"];
const TOTAL_STEPS = 5;

const CURRENCIES = [
  { code: "eur", label: "EUR €", symbol: "€" },
  { code: "gbp", label: "GBP £", symbol: "£" },
  { code: "usd", label: "USD $", symbol: "$" },
  { code: "aud", label: "AUD $", symbol: "$" },
];

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span style={{ color: "var(--text-muted)" }}>{label}</span>
      <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{value}</span>
    </div>
  );
}

export default function NewGroupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [user, setUser] = useState<any>(null);
  const [step, setStep] = useState(1);
  const [groupType, setGroupType] = useState<string | null>(null);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loadingMeetings, setLoadingMeetings] = useState(false);
  const [selectedMeetingIds, setSelectedMeetingIds] = useState<string[]>([]);
  const [groupName, setGroupName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [pin, setPin] = useState("");
  const [ownerPlaying, setOwnerPlaying] = useState(true);
  const [maxPlayers, setMaxPlayers] = useState(20);
  const [currency, setCurrency] = useState("eur");
  const [saving, setSaving] = useState(false);
  const [selectedLeague, setSelectedLeague] = useState("");

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUser(user);
      const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
      if (profile?.full_name) setDisplayName(profile.full_name);
    };
    init();
  }, []);

  useEffect(() => {
    if (groupType === "horse_racing" && meetings.length === 0) {
      setLoadingMeetings(true);
      supabase.from("meetings").select("*")
        .not("status", "in", '("closed","completed")')
        .order("date")
        .then(({ data }) => { setMeetings(data ?? []); setLoadingMeetings(false); });
    }
  }, [groupType]);

  const canGoNext = () => {
    if (step === 1) return !!groupType;
    if (step === 2) {
      if (groupType === "horse_racing") return selectedMeetingIds.length > 0;
      if (groupType === "last_man_standing") return !!selectedLeague;
    }
    if (step === 3) return groupName.trim().length > 0 && displayName.trim().length > 0 && pin.length === 4;
    if (step === 4) return !!maxPlayers;
    return true;
  };

  const handleCreate = async () => {
    if (!user) return;
    setSaving(true);

    let startDate = null;
    if (groupType === "horse_racing" && selectedMeetingIds.length > 0) {
      const selected = meetings.filter(m => selectedMeetingIds.includes(m.id));
      const dates = selected.map(m => m.date).filter(Boolean).sort();
      startDate = dates[0] || null;
    }

    const { data: newGroup, error } = await supabase.from("groups").insert({
      name: groupName.trim(),
      owner_email: user.email,
      member_emails: ownerPlaying ? [user.email] : [],
      member_names: ownerPlaying ? { [user.email]: displayName.trim() } : {},
      meeting_ids: groupType === "horse_racing" ? selectedMeetingIds : [],
      daily_meeting_ids: [],
      invite_code: generateInviteCode(),
      join_pin: pin.trim(),
      type: groupType,
      entry_fee_enabled: false,
      entry_fee: 0,
      currency,
      max_players: maxPlayers,
      price_per_player: 0,
      start_date: startDate,
      payment_status: "paid",
      status: "active",
    }).select().single();

    if (error) {
      toast.error("Failed to create group. Please try again.");
      setSaving(false);
      return;
    }

    toast.success(`${groupName} created!`);
    router.push(`/group/${newGroup.id}`);
  };

  const toggleMeeting = (id: string) => {
    setSelectedMeetingIds(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);
  };

  const packOptions = [
    { players: 20, price: 20 },
    { players: 30, price: 30 },
    { players: 40, price: 40 },
    { players: 50, price: 50 },
  ];
  const pack = packOptions.find(p => p.players === maxPlayers) || packOptions[0];
  const currSymbol = CURRENCIES.find(c => c.code === currency)?.symbol || "€";

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-6" style={{ background: "var(--bg)" }}>
      <div className="w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl bg-white" style={{ maxHeight: "90vh", display: "flex", flexDirection: "column" }}>

        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-3">
            {step > 1 && (
              <button onClick={() => setStep(s => s - 1)} className="w-8 h-8 flex items-center justify-center rounded-full" style={{ background: "var(--bg)" }}>
                <ChevronLeft className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
              </button>
            )}
            <div>
              <h2 className="font-bold text-lg" style={{ color: "var(--text-primary)" }}>Create a Group</h2>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>{STEP_LABELS[step - 1]}</p>
            </div>
          </div>
          <button onClick={() => router.back()} className="w-8 h-8 flex items-center justify-center rounded-full" style={{ background: "var(--bg)" }}>
            <X className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
          </button>
        </div>

        <div className="flex gap-1.5 px-6 py-3">
          {STEP_LABELS.map((_, i) => (
            <div key={i} className="h-1.5 flex-1 rounded-full transition-all duration-300"
              style={{ background: i < step ? "#22c55e" : "var(--border)" }} />
          ))}
        </div>

        <div className="px-6 pb-4 overflow-y-auto flex-1">

          {step === 1 && (
            <div className="space-y-3">
              <p className="text-sm mb-3" style={{ color: "var(--text-muted)" }}>What type of competition do you want to run?</p>
              <button onClick={() => { setGroupType("horse_racing"); setStep(2); }}
                className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all hover:border-green-300"
                style={{ borderColor: "var(--border)" }}>
                <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center text-2xl flex-shrink-0">🏇</div>
                <div className="flex-1">
                  <p className="font-bold" style={{ color: "var(--text-primary)" }}>Horse Racing Tipping</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Pick winners across race meetings and earn points</p>
                </div>
                <ChevronRight className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
              </button>
              <button onClick={() => { setGroupType("last_man_standing"); setStep(2); }}
                className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all hover:border-purple-300"
                style={{ borderColor: "var(--border)" }}>
                <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center text-2xl flex-shrink-0">⚔️</div>
                <div className="flex-1">
                  <p className="font-bold" style={{ color: "var(--text-primary)" }}>Last Man Standing</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Pick one team per week — don&apos;t get eliminated!</p>
                </div>
                <ChevronRight className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
              </button>
            </div>
          )}

          {step === 2 && groupType === "horse_racing" && (
            <div className="space-y-3">
              <p className="text-sm mb-1" style={{ color: "var(--text-muted)" }}>Select the meeting(s) to include in this series.</p>
              {loadingMeetings ? (
                <div className="flex items-center justify-center py-10">
                  <div className="w-6 h-6 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : meetings.length === 0 ? (
                <div className="rounded-xl border p-6 text-center" style={{ borderColor: "var(--border)" }}>
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>No upcoming meetings available right now.</p>
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Ask an admin to add meetings first.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {meetings.map(m => {
                    const selected = selectedMeetingIds.includes(m.id);
                    return (
                      <button key={m.id} onClick={() => toggleMeeting(m.id)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all"
                        style={{ borderColor: selected ? "#22c55e" : "var(--border)", background: selected ? "#f0fdf4" : "var(--bg-card)" }}>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${selected ? "bg-green-500 border-green-500" : ""}`}
                          style={!selected ? { borderColor: "var(--border)" } : {}}>
                          {selected && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{m.name}</p>
                          <p className="text-xs" style={{ color: "var(--text-muted)" }}>{m.venue} · {m.date}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              {selectedMeetingIds.length > 0 && (
                <p className="text-xs font-semibold text-green-600">{selectedMeetingIds.length} meeting{selectedMeetingIds.length > 1 ? "s" : ""} selected</p>
              )}
            </div>
          )}

          {step === 2 && groupType === "last_man_standing" && (
            <div className="space-y-3">
              <p className="text-sm mb-3" style={{ color: "var(--text-muted)" }}>Select the league your competition will be based on.</p>
              {["Premier League 🏴󠁧󠁢󠁥󠁮󠁧󠁿", "La Liga 🇪🇸", "Bundesliga 🇩🇪", "Serie A 🇮🇹", "Ligue 1 🇫🇷", "AFL 🇦🇺", "NRL 🇦🇺"].map(league => (
                <button key={league} onClick={() => setSelectedLeague(league)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 text-left transition-all"
                  style={{ borderColor: selectedLeague === league ? "#a855f7" : "var(--border)", background: selectedLeague === league ? "#faf5ff" : "var(--bg-card)" }}>
                  <span className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>{league}</span>
                  {selectedLeague === league && <Check className="w-4 h-4 text-purple-500" />}
                </button>
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold block mb-1.5" style={{ color: "var(--text-primary)" }}>Group name</label>
                <input placeholder="e.g. The Legends Cup 2025" value={groupName} onChange={e => setGroupName(e.target.value)} autoFocus
                  className="w-full h-11 rounded-xl border border-slate-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
              </div>
              <div>
                <label className="text-sm font-semibold block mb-1.5" style={{ color: "var(--text-primary)" }}>Your display name</label>
                <input placeholder="How your name appears on the leaderboard" value={displayName} onChange={e => setDisplayName(e.target.value)}
                  className="w-full h-11 rounded-xl border border-slate-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
              </div>
              <div>
                <label className="text-sm font-semibold block mb-1" style={{ color: "var(--text-primary)" }}>Join PIN</label>
                <p className="text-xs mb-1.5" style={{ color: "var(--text-muted)" }}>Members will need this 4-digit PIN to join</p>
                <input placeholder="Choose a 4-digit PIN" value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  maxLength={4} inputMode="numeric"
                  className="w-full h-11 rounded-xl border border-slate-200 px-4 text-sm font-mono tracking-widest text-lg focus:outline-none focus:ring-2 focus:ring-green-400" />
              </div>
              <div className="rounded-2xl border p-4" style={{ borderColor: "var(--border)" }}>
                <p className="text-sm font-semibold mb-2" style={{ color: "var(--text-primary)" }}>Are you competing?</p>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setOwnerPlaying(true)}
                    className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${ownerPlaying ? "border-green-500 bg-green-50 text-green-700" : ""}`}
                    style={!ownerPlaying ? { borderColor: "var(--border)", color: "var(--text-muted)" } : {}}>
                    ✅ Yes, I&apos;m in
                  </button>
                  <button onClick={() => setOwnerPlaying(false)}
                    className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${!ownerPlaying ? "border-slate-400 bg-slate-50 text-slate-700" : ""}`}
                    style={ownerPlaying ? { borderColor: "var(--border)", color: "var(--text-muted)" } : {}}>
                    Just managing
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>How many players will be in your group?</p>
              <div className="grid grid-cols-2 gap-3">
                {packOptions.map(({ players, price }) => (
                  <button key={players} onClick={() => setMaxPlayers(players)}
                    className={`rounded-2xl border-2 p-4 text-left transition-all ${maxPlayers === players ? "border-green-500 bg-green-50" : "hover:border-green-200"}`}
                    style={maxPlayers !== players ? { borderColor: "var(--border)" } : {}}>
                    <p className="text-xl font-bold mb-0.5" style={{ color: "var(--text-primary)" }}>{players}</p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>players</p>
                    <p className="text-base font-bold text-green-600 mt-2">{currSymbol}{price}</p>
                    <p className="text-xs text-green-500">platform fee</p>
                  </button>
                ))}
              </div>
              <div>
                <label className="text-sm font-semibold block mb-1.5" style={{ color: "var(--text-primary)" }}>Currency</label>
                <select value={currency} onChange={e => setCurrency(e.target.value)}
                  className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm bg-white">
                  {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                </select>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <div className="rounded-2xl border p-4 space-y-3" style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Summary</p>
                <SummaryRow label="Group name" value={groupName} />
                <SummaryRow label="Type" value={groupType === "horse_racing" ? "🏇 Horse Racing" : "⚔️ Last Man Standing"} />
                {groupType === "last_man_standing" && <SummaryRow label="League" value={selectedLeague} />}
                {groupType === "horse_racing" && <SummaryRow label="Meetings" value={`${selectedMeetingIds.length} selected`} />}
                <SummaryRow label="Your role" value={ownerPlaying ? "Owner + Player" : "Owner only"} />
                <SummaryRow label="Max players" value={`${maxPlayers} players`} />
              </div>
              <div className="rounded-2xl border-2 border-green-400 bg-green-50 p-5 text-center">
                <p className="text-xs text-green-600 mb-1 font-semibold uppercase tracking-widest">One-time platform fee</p>
                <p className="text-4xl font-bold text-green-700">{currSymbol}{pack.price}</p>
                <p className="text-sm text-green-600 mt-1">for up to {maxPlayers} players</p>
              </div>
              <p className="text-xs text-center" style={{ color: "var(--text-muted)" }}>
                Your group will be created immediately.
              </p>
            </div>
          )}
        </div>

        <div className="px-6 pb-6 pt-2">
          {step < TOTAL_STEPS ? (
            <button onClick={() => setStep(s => s + 1)} disabled={!canGoNext()}
              className="w-full h-12 rounded-xl bg-green-500 hover:bg-green-600 text-white text-base font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={handleCreate} disabled={saving}
              className="w-full h-12 rounded-xl bg-green-500 hover:bg-green-600 text-white text-base font-semibold disabled:opacity-50">
              {saving ? "Creating..." : "Create Group"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
