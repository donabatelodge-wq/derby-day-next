"use client";

import { useState, useEffect } from "react";
import { Timer } from "lucide-react";

const MINUTES_BEFORE = 30;

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function computeDeadline(meetingDate: string, firstRaceTime: string, minutesBefore = MINUTES_BEFORE): Date | null {
  if (!meetingDate || !firstRaceTime) return null;
  const raceDateTime = new Date(`${meetingDate}T${firstRaceTime}:00`);
  if (isNaN(raceDateTime.getTime())) return null;
  return new Date(raceDateTime.getTime() - minutesBefore * 60 * 1000);
}

export function isDeadlinePassed(meetingDate: string, firstRaceTime: string, minutesBefore = MINUTES_BEFORE): boolean {
  const deadline = computeDeadline(meetingDate, firstRaceTime, minutesBefore);
  if (!deadline) return false;
  return new Date() >= deadline;
}

function useCountdown(deadline: Date | null) {
  const getTimeLeft = () => {
    if (!deadline) return null;
    const diff = deadline.getTime() - new Date().getTime();
    if (diff <= 0) return null;
    return {
      hours: Math.floor(diff / 1000 / 60 / 60),
      minutes: Math.floor((diff / 1000 / 60) % 60),
      seconds: Math.floor((diff / 1000) % 60),
      total: diff,
    };
  };

  const [timeLeft, setTimeLeft] = useState(getTimeLeft);

  useEffect(() => {
    if (!deadline) return;
    const tick = setInterval(() => setTimeLeft(getTimeLeft()), 1000);
    return () => clearInterval(tick);
  }, [deadline]);

  return timeLeft;
}

interface Props {
  meetingDate: string;
  firstRaceTime: string;
  minutesBefore?: number;
}

export default function RaceEntryDeadlineClock({ meetingDate, firstRaceTime, minutesBefore = MINUTES_BEFORE }: Props) {
  const deadline = computeDeadline(meetingDate, firstRaceTime, minutesBefore);
  const timeLeft = useCountdown(deadline);

  if (!deadline || !timeLeft) return null;

  const isUrgent = timeLeft.total < 10 * 60 * 1000;

  return (
    <div
      className="rounded-2xl px-4 py-4 mb-5 flex items-center gap-4"
      style={{
        background: isUrgent
          ? "linear-gradient(135deg, #dc2626, #b91c1c)"
          : "linear-gradient(135deg, #d97706, #b45309)",
        color: "#fff",
      }}
    >
      <div className="flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.15)" }}>
        <Timer className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider opacity-80">Entry deadline</p>
        <p className="text-sm font-medium opacity-90 mt-0.5">
          {isUrgent ? "⚠️ Closing soon — submit your picks now!" : `Entries close ${minutesBefore} mins before the first race`}
        </p>
      </div>
      <div className="flex-shrink-0 flex items-baseline gap-0.5 font-mono font-bold text-2xl tracking-tight">
        {timeLeft.hours > 0 && (
          <>
            <span>{pad(timeLeft.hours)}</span>
            <span className="text-sm opacity-60 mx-0.5">h</span>
          </>
        )}
        <span>{pad(timeLeft.minutes)}</span>
        <span className="text-sm opacity-60 mx-0.5">m</span>
        <span>{pad(timeLeft.seconds)}</span>
        <span className="text-sm opacity-60 ml-0.5">s</span>
      </div>
    </div>
  );
}
