"use client";

import { useRouter } from "next/navigation";
import { Users, UserPlus } from "lucide-react";

interface Props {
  content: any;
  isAdmin: boolean;
  userEmail: string;
}

export function HomeButtons({ content, isAdmin, userEmail }: Props) {
  const router = useRouter();

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

  return (
    <div className="flex flex-col items-center gap-3 w-full">

      {show("show_info_button_1") && (
        <button className="w-full py-4 font-semibold rounded-2xl text-center shadow-md text-slate-900 text-base"
          style={{ background: content.info_button_1_color || "#facc15" }}>
          {content.info_button_1_label || "ℹ️ App Info"}
        </button>
      )}

      {show("show_info_button_2") && (
        <button className="w-full py-4 font-semibold rounded-2xl text-center shadow-md text-white text-base"
          style={{ background: content.info_button_2_color || "#3b82f6" }}>
          {content.info_button_2_label || "📋 Competition Rules"}
        </button>
      )}

      {show("show_how_it_works_button") && (
        <button className="w-full py-4 font-bold rounded-2xl text-center shadow-md text-white text-base"
          style={{ background: "#ec4899" }}>
          How To Start A Racing Competition
        </button>
      )}

      {show("show_race_sweep_button") && (
        <button onClick={() => router.push("/race-sweep")}
          className="w-full py-4 font-semibold rounded-2xl text-center shadow-md text-white text-base"
          style={{ background: "#f97316" }}>
          Do A Race Sweep 🐴
        </button>
      )}

      {show("show_racing_competition_button", true) && (
        <button onClick={() => router.push("/group/new")}
          className="w-full py-4 font-semibold rounded-2xl text-center shadow-md text-white text-base active:scale-95 transition-transform"
          style={{ background: "#22c55e" }}>
          {content?.button_racing_competition_label || "Start A Racing Competition 🏇"}
        </button>
      )}

      {show("show_lms_button") && (
        <button onClick={() => router.push("/group/new")}
          className="w-full py-4 font-semibold rounded-2xl text-center shadow-md text-white text-base active:scale-95 transition-transform"
          style={{ background: "#9333ea" }}>
          {content?.button_football_competition_label || "Start A Football Competition ⚽"}
        </button>
      )}

      {show("show_join_group_button", true) && (
        <button onClick={() => router.push("/join")}
          className="w-full py-4 font-semibold rounded-2xl text-center shadow-md text-white text-base flex items-center justify-center gap-2 active:scale-95 transition-transform"
          style={{ background: "#92400e" }}>
          <Users className="w-5 h-5" />
          {content?.button_join_group_label || "Join A Competition"}
        </button>
      )}

      {show("show_nfl_button") && (
        <button onClick={() => router.push("/group/new")}
          className="w-full py-4 font-semibold rounded-2xl text-center shadow-md text-white text-base"
          style={{ background: "#2563eb" }}>
          {content?.button_nfl_label || "NFL Survivor Pool"}
        </button>
      )}

      {show("show_football_leagues_button") && (
        <button className="w-full py-4 font-semibold rounded-2xl text-center shadow-md text-white text-base"
          style={{ background: "#6b7280" }}>
          {content?.button_football_label || "World Football Leagues"}
        </button>
      )}

      {userEmail && show("show_invite_button") && (
        <button onClick={handleShare}
          className="w-full py-4 font-semibold rounded-2xl text-center shadow-md text-white text-base flex items-center justify-center gap-2"
          style={{ background: "#ef4444" }}>
          <UserPlus className="w-5 h-5" />
          {content?.button_invite_label || "Invite Friends"}
        </button>
      )}

      {show("show_contact_button") && content?.contact_email && (
        <a href={`mailto:${content.contact_email}`}
          className="w-full py-4 font-semibold rounded-2xl text-center shadow-md text-white text-base"
          style={{ background: "#0ea5e9" }}>
          {content?.button_contact_label || "Contact Us"}
        </a>
      )}

      {isAdmin && (
        <button onClick={() => router.push("/admin/welcome")}
          className="text-sm text-slate-400 hover:text-slate-600 transition-colors mt-1">
          ✏️ Edit Page
        </button>
      )}
    </div>
  );
}
