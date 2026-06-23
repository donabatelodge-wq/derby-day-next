"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ChevronRight, ChevronLeft, Check, X } from "lucide-react";
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
    <div className="flex justify-between text-sm py-2 border-b border-slate-100 last:border-0">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-slate-900">{value}</span>
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
    <div className="min-h-screen flex flex-col" style={{ background: "#f8fafc" }}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-12 pb-4"
        style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f4c2a 100%)" }}>
        <div className="flex items-center gap-3">
          {step > 1 && (
            <button onClick={() => setStep(s => s - 1)}
              className="w-9 h-9 flex items-center justify-center rounded-xl"
              style={{ background: "rgba(255,255,255,0.1)" }}>
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
          )}
          <div>
            <h1 className="text-white font-black text-lg">Create a Group</h1>
            <p className="text-green-400 text-xs">{STEP_LABELS[step - 1]}</p>
          </div>
        </div>
        <button onClick={() => router.back()}
          className="w-9 h-9 flex items-center justify-center rounded-xl"
          style={{ background: "rgba(255,255,255,0.1)" }}>
          <X className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="flex gap-1 px-4 py-3" style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f4c2a 100%)" }}>
        {STEP_LABELS.map((_, i) => (
          <div key={i} className="h-1 flex-1 rounded-full transition-all duration-300"
            style={{ background: i < step ? "#22c55e" : "rgba(255,255,255,0.2)" }} />
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col">

        {/* Step 1 — Type */}
        {step === 1 && (
          <div className="space-y-3">
            <p className="text-slate-500 text-sm mb-4">What type of competition do you want to run?</p>
            <button onClick={() => { setGroupType("horse_racing"); setStep(2); }}
              className="w-full flex items-center gap-4 p-5 rounded-2xl bg-white border-2 border-transparent hover:border-green-300 text-left transition-all active:scale-95 shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-green-100 flex items-center justify-center text-3xl flex-shrink-0">🏇</div>
              <div className="flex-1">
                <p className="font-bold text-slate-900 text-base">Horse Racing Tipping</p>
                <p className="text-xs text-slate-500 mt-0.5">Pick winners across race meetings and earn points</p>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-300" />
            </button>
            <button onClick={() => { setGroupType("last_man_standing"); setStep(2); }}
              className="w-full flex items-center gap-4 p-5 rounded-2xl bg-white border-2 border-transparent hover:border-purple-300 text-left transition-all active:scale-95 shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-purple-100 flex items-center justify-center text-3xl flex-shrink-0">⚽</div>
              <div className="flex-1">
                <p className="font-bold text-slate-900 text-base">Last Man Standing</p>
                <p className="text-xs text-slate-500 mt-0.5">Pick one team per week — don&apos;t get eliminated!</p>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-300" />
            </button>
          </div>
        )}

        {/* Step 2a — Horse Racing meetings */}
        {step === 2 && groupType === "horse_racing" && (
          <div className="space-y-3">
            <p className="text-slate-500 text-sm mb-4">Select the meeting(s) to include in this series.</p>
            {loadingMeetings ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : meetings.length === 0 ? (
              <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
                <p className="text-slate-500 text-sm">No upcoming meetings available.</p>
                <p className="text-slate-400 text-xs mt-1">Ask an admin to add meetings first.</p>
              </div>
            ) : (
              meetings.map(m => {
                const selected = selectedMeetingIds.includes(m.id);
                return (
                  <button key={m.id} onClick={() => toggleMeeting(m.id)}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all active:scale-95 shadow-sm"
                    style={{
                      borderColor: selected ? "#22c55e" : "transparent",
                      background: selected ? "#f0fdf4" : "#ffffff"
                    }}>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${selected ? "bg-green-500 border-green-500" : "border-slate-300"}`}>
                      {selected && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900">{m.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{m.venue} · {m.date}</p>
                    </div>
                  </button>
                );
              })
            )}
            {selectedMeetingIds.length > 0 && (
              <p className="text-xs font-semibold text-green-600 text-center">
                {selectedMeetingIds.length} meeting{selectedMeetingIds.length > 1 ? "s" : ""} selected
              </p>
            )}
          </div>
        )}

        {/* Step 2b — LMS league */}
        {step === 2 && groupType === "last_man_standing" && (
          <div className="space-y-2">
            <p className="text-slate-500 text-sm mb-4">Select the league your competition will be based on.</p>
            {["Premier League 🏴󠁧󠁢󠁥󠁮󠁧󠁿", "La Liga 🇪🇸", "Bundesliga 🇩🇪", "Serie A 🇮🇹", "Ligue 1 🇫🇷", "Eredivisie 🇳🇱", "AFL 🇦🇺", "NRL 🇦🇺", "NFL 🇺🇸"].map(league => (
  <button key={league} onClick={() => setSelectedLeague(league)}
    className="w-full flex items-center justify-between px-5 py-4 rounded-2xl border-2 text-left transition-all active:scale-95 shadow-sm"
    style={{
      borderColor: selectedLeague === league ? "#a855f7" : "transparent",
      background: selectedLeague === league ? "#faf5ff" : "#ffffff"
    }}>
    <span className="font-semibold text-slate-900 text-base">{league}</span>
    {selectedLeague === league && <Check className="w-5 h-5 text-purple-500" />}
  </button>
))}
          </div>
        )}

        {/* Step 3 — Details */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Group name</label>
              <input placeholder="e.g. The Legends Cup 2025" value={groupName} onChange={e => setGroupName(e.target.value)} autoFocus
                className="w-full h-12 rounded-2xl border border-slate-200 px-4 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-400 shadow-sm" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Your display name</label>
              <input placeholder="How your name appears on the leaderboard" value={displayName} onChange={e => setDisplayName(e.target.value)}
                className="w-full h-12 rounded-2xl border border-slate-200 px-4 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-400 shadow-sm" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Join PIN</label>
              <p className="text-xs text-slate-400 mb-2">Members will need this 4-digit PIN to join</p>
              <input placeholder="Choose a 4-digit PIN" value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                maxLength={4} inputMode="numeric"
                className="w-full h-12 rounded-2xl border border-slate-200 px-4 text-lg font-mono tracking-widest bg-white focus:outline-none focus:ring-2 focus:ring-green-400 shadow-sm" />
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-sm font-bold text-slate-700 mb-3">Are you competing?</p>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setOwnerPlaying(true)}
                  className={`py-3 rounded-xl text-sm font-bold border-2 transition-all ${ownerPlaying ? "border-green-500 bg-green-50 text-green-700" : "border-slate-200 text-slate-500"}`}>
                  ✅ Yes, I&apos;m in
                </button>
                <button onClick={() => setOwnerPlaying(false)}
                  className={`py-3 rounded-xl text-sm font-bold border-2 transition-all ${!ownerPlaying ? "border-slate-400 bg-slate-50 text-slate-700" : "border-slate-200 text-slate-400"}`}>
                  Just managing
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 4 — Players */}
        {step === 4 && (
          <div className="space-y-5">
            <p className="text-slate-500 text-sm">How many players will be in your group?</p>
            <div className="grid grid-cols-2 gap-3">
              {packOptions.map(({ players, price }) => (
                <button key={players} onClick={() => setMaxPlayers(players)}
                  className={`rounded-2xl border-2 p-5 text-left transition-all active:scale-95 shadow-sm ${maxPlayers === players ? "border-green-500 bg-green-50" : "border-transparent bg-white"}`}>
                  <p className="text-3xl font-black text-slate-900">{players}</p>
                  <p className="text-xs text-slate-400 mt-0.5">players max</p>
                  <p className="text-xl font-bold text-green-600 mt-3">{currSymbol}{price}</p>
                  <p className="text-xs text-green-500">platform fee</p>
                </button>
              ))}
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Currency</label>
              <select value={currency} onChange={e => setCurrency(e.target.value)}
                className="w-full h-12 rounded-2xl border border-slate-200 px-4 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-green-400">
                {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* Step 5 — Confirm */}
        {step === 5 && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Summary</p>
              <SummaryRow label="Group name" value={groupName} />
              <SummaryRow label="Type" value={groupType === "horse_racing" ? "🏇 Horse Racing" : "⚽ Last Man Standing"} />
              {groupType === "last_man_standing" && <SummaryRow label="League" value={selectedLeague} />}
              {groupType === "horse_racing" && <SummaryRow label="Meetings" value={`${selectedMeetingIds.length} selected`} />}
              <SummaryRow label="Your role" value={ownerPlaying ? "Owner + Player" : "Owner only"} />
              <SummaryRow label="Max players" value={`${maxPlayers} players`} />
            </div>
            <div className="rounded-2xl p-6 text-center shadow-sm"
              style={{ background: "linear-gradient(135deg, #0f172a 0%, #0f4c2a 100%)" }}>
              <p className="text-green-400 text-xs font-bold uppercase tracking-widest mb-2">One-time platform fee</p>
              <p className="text-5xl font-black text-white">{currSymbol}{pack.price}</p>
              <p className="text-green-400 text-sm mt-1">for up to {maxPlayers} players</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer button */}
      <div className="px-4 pt-3 pb-6 bg-white border-t border-slate-100"
        style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}>
        {step < TOTAL_STEPS ? (
          <button onClick={() => setStep(s => s + 1)} disabled={!canGoNext()}
            className="w-full h-14 rounded-2xl text-white font-black text-base flex items-center justify-center gap-2 disabled:opacity-40 transition-all active:scale-95"
            style={{ background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)" }}>
            Continue <ChevronRight className="w-5 h-5" />
          </button>
        ) : (
          <button onClick={handleCreate} disabled={saving}
            className="w-full h-14 rounded-2xl text-white font-black text-base disabled:opacity-40 transition-all active:scale-95"
            style={{ background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)" }}>
            {saving ? "Creating..." : "Create Group 🎉"}
          </button>
        )}
      </div>
    </div>
  );
}
