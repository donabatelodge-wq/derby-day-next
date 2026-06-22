"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Trophy, Star, CheckCircle, Lock, Send } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import RaceEntryDeadlineClock, { isDeadlinePassed } from "@/components/racing/race-entry-deadline-clock";

export default function EnterTipsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const meetingId = searchParams.get("meetingId");
  const groupId = searchParams.get("groupId");
  const supabase = createClient();

  const [meeting, setMeeting] = useState<any>(null);
  const [races, setRaces] = useState<any[]>([]);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [name, setName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [nameSubmitted, setNameSubmitted] = useState(false);
  const [selections, setSelections] = useState<Record<string, string | null>>({});
  const [bestChance, setBestChance] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [alreadyEntered, setAlreadyEntered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [checkingName, setCheckingName] = useState(false);
  const [saving, setSaving] = useState(false);
  const [, setTick] = useState(0);
  const [meetingDate, setMeetingDate] = useState<string | null>(null);
  const [firstRaceTime, setFirstRaceTime] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!meetingId) return;
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push(`/login?next=/enter-tips?meetingId=${meetingId}&groupId=${groupId}`); return; }
      setUserEmail(user.email ?? "");

      const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
      if (profile?.full_name) {
        const parts = profile.full_name.trim().split(" ");
        setFirstName(parts[0] || "");
        setLastName(parts.slice(1).join(" ") || "");
      }

      const [{ data: meetingData }, { data: racesData }] = await Promise.all([
        supabase.from("meetings").select("*").eq("id", meetingId).single(),
        supabase.from("races").select("*").eq("meeting_id", meetingId).order("race_number"),
      ]);

      setMeeting(meetingData);
      setRaces(racesData ?? []);

      if (meetingData?.date) {
        setMeetingDate(meetingData.date);
        const sorted = (racesData ?? []).filter((r: any) => r.race_time).sort((a: any, b: any) => a.race_time.localeCompare(b.race_time));
        if (sorted.length > 0) setFirstRaceTime(sorted[0].race_time);
      }

      setLoading(false);
    };
    load();
  }, [meetingId]);

  const handleNameContinue = async () => {
    setCheckingName(true);
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    setName(fullName);
    
    const { data: existing } = await query;let query = supabase.from("entries").select("id").eq("meeting_id", meetingId!).eq("user_email", userEmail);
if (groupId) query = query.eq("group_id", groupId);
else query = query.is("group_id", null);
    if (existing && existing.length > 0) setAlreadyEntered(true);
    setNameSubmitted(true);
    setCheckingName(false);
  };

  const handleSelect = (raceId: string, horseName: string) => {
    const newVal = selections[raceId] === horseName ? null : horseName;
    setSelections(prev => ({ ...prev, [raceId]: newVal }));
    if (bestChance === raceId && !newVal) setBestChance(null);
  };

  const allSelected = races.length > 0 && races.every(r => selections[r.id]);

  const handleSubmit = async () => {
    if (isDeadlinePassed(meetingDate!, firstRaceTime!)) {
      toast.error("Entry deadline has passed. Picks are now locked.");
      return;
    }
    
    const { data: existing let query = supabase.from("entries").select("id").eq("meeting_id", meetingId!).eq("user_email", userEmail);
if (groupId) query = query.eq("group_id", groupId);
else query = query.is("group_id", null);} = await query;
    if (existing && existing.length > 0) {
      toast.error("You have already submitted an entry for this meeting.");
      setAlreadyEntered(true);
      return;
    }
    setSaving(true);
    const selArray = races.map(r => ({
      race_id: r.id,
      race_number: r.race_number,
      horse_name: selections[r.id] || "",
      is_best_chance: bestChance === r.id,
      finish_position: null,
    }));
    const { error } = await supabase.from("entries").insert({
      meeting_id: meetingId,
      ...(groupId ? { group_id: groupId } : {}),
      user_email: userEmail,
      participant_name: name.trim(),
      selections: selArray,
      total_points: 0,
      submitted: true,
    });
    if (error) {
      if (error.code === "23505") {
        toast.error("You have already submitted an entry for this meeting.");
        setAlreadyEntered(true);
      } else {
        toast.error("Failed to submit entry. Please try again.");
      }
    } else {
      setSubmitted(true);
      toast.success("Entry submitted! Good luck!");
    }
    setSaving(false);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
      <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!meeting) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)", color: "var(--text-muted)" }}>
      Meeting not found.
    </div>
  );

  if (meeting.status !== "open") {
    const messages: Record<string, { title: string; body: string }> = {
      upcoming:  { title: "Not Open Yet",     body: "This meeting isn't open for entries yet. Check back soon!" },
      closed:    { title: "Entries Closed",    body: "This meeting is no longer accepting entries." },
      completed: { title: "Meeting Completed", body: "This meeting has finished. Check the leaderboard for results." },
    };
    const msg = messages[meeting.status] || { title: "Unavailable", body: "Entries are not available for this meeting." };
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center" style={{ background: "var(--bg)" }}>
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <Trophy className="w-8 h-8 text-slate-400" />
        </div>
        <h2 className="text-2xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>{msg.title}</h2>
        <p className="mb-6" style={{ color: "var(--text-muted)" }}>{msg.body}</p>
        <Link href="/" className="text-sm underline" style={{ color: "var(--text-muted)" }}>Back to home</Link>
      </div>
    );
  }

  if (meetingDate && firstRaceTime && isDeadlinePassed(meetingDate, firstRaceTime)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center" style={{ background: "var(--bg)" }}>
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <Lock className="w-8 h-8 text-red-400" />
        </div>
        <h2 className="text-2xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>Entries Locked</h2>
        <p className="mb-2" style={{ color: "var(--text-muted)" }}>The entry deadline has passed (30 minutes before the first race).</p>
        {firstRaceTime && <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>First race: <span className="font-semibold">{firstRaceTime}</span></p>}
        <Link href="/" className="text-sm underline" style={{ color: "var(--text-muted)" }}>Back to home</Link>
      </div>
    );
  }

  if (submitted) return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center" style={{ background: "var(--bg)" }}>
      <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
        <CheckCircle className="w-8 h-8 text-emerald-500" />
      </div>
      <h2 className="text-2xl font-bold text-slate-900 mb-2">Entry Submitted!</h2>
      <p className="text-slate-500 mb-6">Good luck, {name}. Check the leaderboard once results are in.</p>
      {groupId
        ? <Link href={`/group/${groupId}`} className="text-sm text-slate-500 underline">Back to competition</Link>
        : <Link href="/" className="text-sm text-slate-500 underline">Back to home</Link>
      }
    </div>
  );

  if (nameSubmitted && alreadyEntered) return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center" style={{ background: "var(--bg)" }}>
      <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
        <Trophy className="w-8 h-8 text-amber-500" />
      </div>
      <h2 className="text-2xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>Already Entered</h2>
      <p className="mb-6" style={{ color: "var(--text-muted)" }}><strong>{name || userEmail}</strong> has already submitted an entry for this meeting.</p>
      {groupId
        ? <Link href={`/group/${groupId}`} className="text-sm underline" style={{ color: "var(--text-muted)" }}>Back to competition</Link>
        : <Link href="/" className="text-sm underline" style={{ color: "var(--text-muted)" }}>Back to home</Link>
      }
    </div>
  );

  if (!nameSubmitted) return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: "var(--bg)" }}>
      <div className="w-full max-w-sm">
        {meetingDate && firstRaceTime && (
          <RaceEntryDeadlineClock meetingDate={meetingDate} firstRaceTime={firstRaceTime} />
        )}
        <h1 className="text-3xl font-bold text-slate-900 mb-1">{meeting.name}</h1>
        <p className="text-slate-500 mb-6">Enter your name to start picking horses.</p>
        <div className="space-y-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input type="email" value={userEmail} disabled
              className="w-full h-12 rounded-xl border border-slate-200 px-4 text-sm bg-slate-50 text-slate-500 cursor-not-allowed" />
            <p className="text-xs text-slate-400 mt-1">Unique identifier — cannot be changed</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
            <input placeholder="First name" value={firstName} onChange={e => setFirstName(e.target.value)}
              className="w-full h-12 rounded-xl border border-slate-200 px-4 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Surname</label>
            <input placeholder="Surname" value={lastName} onChange={e => setLastName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && firstName.trim() && handleNameContinue()}
              className="w-full h-12 rounded-xl border border-slate-200 px-4 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-400" />
          </div>
        </div>
        <button onClick={handleNameContinue} disabled={!firstName.trim() || checkingName}
          className="w-full h-12 bg-slate-900 hover:bg-slate-700 text-white rounded-xl text-base font-semibold disabled:opacity-50">
          {checkingName ? "Checking..." : "Continue"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <div className="max-w-xl mx-auto px-4 py-10">
        {meetingDate && firstRaceTime && (
          <RaceEntryDeadlineClock meetingDate={meetingDate} firstRaceTime={firstRaceTime} />
        )}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">{meeting.name}</h1>
          <p className="text-slate-500 mt-1">
            Pick one horse per race · Mark your <span className="text-amber-500 font-semibold">Best Chance</span> for double points
          </p>
        </div>
        <div className="space-y-4 mb-8">
          {races.map(race => (
            <div key={race.id} className="bg-white rounded-2xl p-5 border border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Race {race.race_number}</span>
                  {race.race_name && <h3 className="font-semibold text-slate-900">{race.race_name}</h3>}
                  {race.race_time && <p className="text-xs text-slate-400 mt-0.5">🕐 {race.race_time}</p>}
                </div>
                <button
                  onClick={() => setBestChance(bestChance === race.id ? null : race.id)}
                  disabled={!selections[race.id]}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    bestChance === race.id
                      ? "bg-amber-400 border-amber-400 text-white"
                      : "border-slate-200 text-slate-400 hover:border-amber-300 hover:text-amber-500 disabled:opacity-30"
                  }`}
                >
                  <Star className="w-3.5 h-3.5" />
                  Best Chance
                </button>
              </div>
              <div className="flex flex-col gap-2">
                {(race.horses || []).map((horse: any) => (
                  <button
                    key={horse.name}
                    onClick={() => handleSelect(race.id, selections[race.id] === horse.name ? "" : horse.name)}
                    className={`flex items-start gap-3 px-4 py-3 rounded-xl border text-sm font-medium transition-all text-left w-full ${
                      selections[race.id] === horse.name
                        ? "bg-slate-900 border-slate-900 text-white"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-400"
                    }`}
                  >
                    <span className={`text-sm font-bold w-6 text-center flex-shrink-0 mt-0.5 ${selections[race.id] === horse.name ? "text-slate-300" : "text-slate-400"}`}>
                      {horse.number}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-base leading-tight">{horse.name}</div>
                      <div className={`text-xs mt-1 leading-snug ${selections[race.id] === horse.name ? "text-slate-300" : "text-slate-500"}`}>
                        {horse.jockey?.trim() ? `J. ${horse.jockey}` : ""}
                        {horse.jockey?.trim() && horse.trainer?.trim() ? " · " : ""}
                        {horse.trainer?.trim() ? `T. ${horse.trainer}` : ""}
                        {!horse.jockey?.trim() && !horse.trainer?.trim() && <span className="italic opacity-50">No jockey/trainer info</span>}
                      </div>
                    </div>
                    {selections[race.id] === horse.name && (
                      <div className="flex-shrink-0 mt-0.5">
                        <CheckCircle className="w-5 h-5 text-amber-400" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
              {selections[race.id] && (
                <p className="text-xs text-slate-400 mt-3">
                  Selected: <span className="font-semibold text-slate-700">{selections[race.id]}</span>
                  {bestChance === race.id && <span className="ml-2 text-amber-500 font-semibold">★ Best Chance</span>}
                </p>
              )}
            </div>
          ))}
        </div>
        {!bestChance && allSelected && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700 mb-4">
            <Star className="w-4 h-4 inline mr-1" /> Don&apos;t forget to mark your <strong>Best Chance</strong> — it scores double points!
          </div>
        )}
        <button
          onClick={handleSubmit}
          disabled={!allSelected || !bestChance || saving}
          className="w-full h-12 bg-slate-900 hover:bg-slate-700 text-white rounded-xl text-base font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
          {saving ? "Submitting..." : "Submit Entry"}
        </button>
        <p className="text-center text-xs text-slate-400 mt-3">
          {Object.values(selections).filter(Boolean).length} of {races.length} races selected
        </p>
      </div>
    </div>
  );
}
