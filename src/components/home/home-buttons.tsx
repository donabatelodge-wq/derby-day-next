"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users, UserPlus, X } from "lucide-react";

interface Props {
  content: any;
  isAdmin: boolean;
  userEmail: string;
}

const DISCLAIMERS: Record<string, { icon: string; title: string; body: string }> = {
  horse_racing: {
    icon: "🏇",
    title: "Racing Competition",
    body: `As Admin of your competition you must pay a small "Platform Management" fee for each player, you can add more players before the competition starts if you need more. Its up to you to collect from and pay out to your players. You decide their fee. Start by selecting all the Race Meetings you want to include. The races for those meetings will be open for horse selections the day before the Race Meeting. Your player points will be displayed on your Leaderboard as results come in. Send out invites to your group.`,
  },
  last_man_standing: {
    icon: "⚽",
    title: "Football Competition",
    body: `As Admin of your competition you must pay a small "Platform Management" fee for each player. You can add more players before a Deadline time and date that YOU set before the competition starts. Your players will need to make their Team Pick each week before the new Deadline that YOU set. If a player forgets to pick the Admin (You) Auto Assigns a team alphabetically using the button before results are input. You will need to put in the Win or Loss for each team via your competition Admin tab. Send out invites to your group.`,
  },
};

export function HomeButtons({ content, isAdmin, userEmail }: Props) {
  const router = useRouter();
  const [pendingType, setPendingType] = useState<"horse_racing" | "last_man_standing" | null>(null);
  const [agreed, setAgreed] = useState(false);

  // Only show a button if explicitly enabled in content
  // Defaults: racing + join = on, everything else = off
  const show = (key: string, defaultOn = false) => {
    if (content?.[key] === true) return true;
    if (content?.[key] === false) return false;
    return defaultOn;
  };

  const handleShare = () => {
    const shareUrl = window.location.origin;
    if (navigator.share) {
      navigator.share({ title: "Derby Day", text: "Join me on Derby Day!", url: shareUrl }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareUrl).catch(() => {});
    }
  };

  const openDisclaimer = (type: "horse_racing" | "last_man_standing") => {
    setAgreed(false);
    setPendingType(type);
  };

  const closeDisclaimer = () => setPendingType(null);

  const handleContinue = () => {
    if (!pendingType || !agreed) return;
    router.push(`/group/new?type=${pendingType}`);
    setPendingType(null);
  };

  const tileClass = "w-full min-h-[168px] px-6 font-black rounded-[28px] text-center shadow-md text-xl leading-snug flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform";

  const activeDisclaimer = pendingType ? DISCLAIMERS[pendingType] : null;

  return (
    <>
      <div className="flex flex-col items-center gap-4 w-full">

        {show("show_info_button_1") && (
          <button className={`${tileClass} text-slate-900`}
            style={{ background: content.info_button_1_color || "#facc15" }}>
            {content.info_button_1_label || "ℹ️ App Info"}
          </button>
        )}

        {show("show_info_button_2") && (
          <button className={`${tileClass} text-white`}
            style={{ background: content.info_button_2_color || "#3b82f6" }}>
            {content.info_button_2_label || "📋 Competition Rules"}
          </button>
        )}

        {show("show_how_it_works_button") && (
          <button className={`${tileClass} text-white`}
            style={{ background: "#ec4899" }}>
            How To Start A Racing Competition
          </button>
        )}

        {show("show_race_sweep_button") && (
          <button onClick={() => router.push("/race-sweep")}
            className={`${tileClass} text-white`}
            style={{ background: "#f97316" }}>
            Do A Race Sweep 🐴
          </button>
        )}

        {show("show_racing_competition_button", true) && (
          <button onClick={() => openDisclaimer("horse_racing")}
            className={`${tileClass} text-white`}
            style={{ background: "#22c55e" }}>
            {content?.button_racing_competition_label || "Start A Racing Competition 🏇"}
          </button>
        )}

        {show("show_lms_button") && (
          <button onClick={() => openDisclaimer("last_man_standing")}
            className={`${tileClass} text-white`}
            style={{ background: "#9333ea" }}>
            {content?.button_football_competition_label || "Start A Football Competition ⚽"}
          </button>
        )}

        {show("show_join_group_button", true) && (
          <button onClick={() => router.push("/join")}
            className={`${tileClass} text-white`}
            style={{ background: "#92400e" }}>
            <Users className="w-8 h-8" />
            {content?.button_join_group_label || "Join A Competition"}
          </button>
        )}

        {show("show_nfl_button") && (
          <button onClick={() => router.push("/group/new")}
            className={`${tileClass} text-white`}
            style={{ background: "#2563eb" }}>
            {content?.button_nfl_label || "NFL Survivor Pool"}
          </button>
        )}

        {show("show_football_leagues_button") && (
          <button className={`${tileClass} text-white`}
            style={{ background: "#6b7280" }}>
            {content?.button_football_label || "World Football Leagues"}
          </button>
        )}

        {userEmail && show("show_invite_button") && (
          <button onClick={handleShare}
            className={`${tileClass} text-white`}
            style={{ background: "#ef4444" }}>
            <UserPlus className="w-8 h-8" />
            {content?.button_invite_label || "Invite Friends"}
          </button>
        )}

        {show("show_contact_button") && content?.contact_email && (
          <a href={`mailto:${content.contact_email}`}
            className={`${tileClass} text-white`}
            style={{ background: "#0ea5e9" }}>
            {content?.button_contact_label || "Contact Us"}
          </a>
        )}

        {isAdmin && (
          <button onClick={() => router.push("/admin/welcome")}
            className="text-sm text-slate-400 hover:text-slate-600 transition-colors mt-2">
            ✏️ Edit Page
          </button>
        )}
      </div>

      {activeDisclaimer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }}>
          <div className="w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl bg-white">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{activeDisclaimer.icon}</span>
                <h3 className="font-black text-lg text-slate-900">{activeDisclaimer.title}</h3>
              </div>
              <button onClick={closeDisclaimer} className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm leading-relaxed text-slate-700">{activeDisclaimer.body}</p>
            </div>
            <div className="px-6 pb-6 space-y-4">
              <button onClick={() => setAgreed(a => !a)} className="w-full flex items-start gap-3 text-left">
                <span className={`w-6 h-6 rounded-md border-2 flex-shrink-0 flex items-center justify-center mt-0.5 transition-colors ${agreed ? "bg-green-500 border-green-500" : "border-slate-300 bg-white"}`}>
                  {agreed && <span className="text-white text-xs font-bold">✓</span>}
                </span>
                <span className="text-sm text-slate-700">I have read and agree to the rules and disclaimer above</span>
              </button>
              <button onClick={handleContinue} disabled={!agreed}
                className="w-full h-14 rounded-2xl font-black text-base text-white disabled:opacity-40 transition-all active:scale-95"
                style={{ background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)" }}>
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
