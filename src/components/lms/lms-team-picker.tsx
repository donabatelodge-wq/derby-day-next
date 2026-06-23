"use client";

import { CheckCircle2, XCircle, Lock } from "lucide-react";

interface Props {
  usedTeams?: string[];
  eliminatedTeams?: string[];
  currentPick: string;
  onPick: (team: string) => void;
  disabled?: boolean;
  teams: string[];
}

export default function LmsTeamPicker({ usedTeams = [], eliminatedTeams = [], currentPick, onPick, disabled, teams }: Props) {
  const teamList = teams && teams.length > 0 ? teams : [];
  return (
    <div className="grid grid-cols-2 gap-2">
      {teamList.map(team => {
        const isUsed = usedTeams.includes(team) && team !== currentPick;
        const isEliminated = eliminatedTeams.includes(team);
        const isSelected = currentPick === team;
        const isUnavailable = isUsed || isEliminated;

        return (
          <button key={team}
            onClick={() => !isUnavailable && !disabled && onPick(team)}
            disabled={isUnavailable || disabled}
            className={`relative flex items-center justify-between px-3 py-3 rounded-xl border text-sm font-medium transition-all
              ${isSelected ? "border-purple-500 bg-purple-50 text-purple-700" : ""}
              ${isUsed ? "opacity-40 cursor-not-allowed border-slate-200" : ""}
              ${isEliminated ? "opacity-30 cursor-not-allowed border-slate-200 line-through" : ""}
              ${!isUnavailable && !isSelected && !disabled ? "border-slate-200 hover:border-purple-300 hover:bg-purple-50 cursor-pointer" : ""}
            `}
            style={!isSelected && !isUnavailable ? { background: "var(--bg-card)", color: "var(--text-primary)" } : {}}
          >
            <span className="truncate">{team}</span>
            {isSelected && <CheckCircle2 className="w-4 h-4 text-purple-500 flex-shrink-0 ml-1" />}
            {isUsed && <Lock className="w-3.5 h-3.5 text-slate-300 flex-shrink-0 ml-1" />}
            {isEliminated && <XCircle className="w-3.5 h-3.5 text-red-300 flex-shrink-0 ml-1" />}
          </button>
        );
      })}
    </div>
  );
}
