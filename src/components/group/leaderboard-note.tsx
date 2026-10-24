"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

const URL_RE = /(https?:\/\/[^\s]+)/g;

// An optional line the organiser writes about their own group, shown under the
// leaderboard title (e.g. "50% / 30% / 20% split" or a payment link). It's the
// organiser's note, not a Derby Day statement, and is labelled as such.
export function LeaderboardNote({ group, isOwner, onSaved }: {
  group: any;
  isOwner: boolean;
  onSaved: (note: string) => void;
}) {
  const supabase = createClient();
  const note: string = group.leaderboard_note || "";
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(note);
  const [saving, setSaving] = useState(false);

  if (!note && !isOwner) return null;

  const firstLink = note.match(/https?:\/\/[^\s]+/)?.[0];

  const copyLink = async () => {
    if (!firstLink) return;
    try {
      await navigator.clipboard.writeText(firstLink);
      toast.success("Link copied.");
    } catch {
      toast.error("Couldn't copy. Press and hold the link to copy it.");
    }
  };

  const save = async () => {
    setSaving(true);
    const trimmed = value.trim();
    const { error } = await supabase
      .from("groups")
      .update({ leaderboard_note: trimmed || null } as any)
      .eq("id", group.id);
    setSaving(false);
    if (error) {
      toast.error("Couldn't save the note. Please try again.");
      return;
    }
    onSaved(trimmed);
    setEditing(false);
    toast.success("Note saved.");
  };

  if (editing) {
    return (
      <div className="px-6 py-4 border-b space-y-3" style={{ borderColor: "var(--border)" }}>
        <label className="text-xs font-medium block" style={{ color: "var(--text-muted)" }}>
          Organiser&apos;s note (shown to everyone in this group)
        </label>
        <input
          value={value}
          onChange={e => setValue(e.target.value)}
          maxLength={200}
          placeholder="e.g. 50% / 30% / 20% split. Pay: https://revolut.me/yourname"
          className="w-full h-11 rounded-xl border px-3 text-base"
          style={{ borderColor: "var(--border)" }}
        />
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          This is your own note. Arrangements are between you and your players. Derby Day doesn&apos;t collect or handle entry fees or prizes.
        </p>
        <div className="flex gap-3">
          <button onClick={save} disabled={saving}
            className="flex-1 h-11 rounded-xl bg-slate-900 hover:bg-slate-700 text-white text-sm font-semibold disabled:opacity-50">
            {saving ? "Saving..." : "Save"}
          </button>
          <button onClick={() => { setValue(note); setEditing(false); }} disabled={saving}
            className="px-4 h-11 rounded-xl border border-slate-200 text-sm text-slate-600">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-3 border-b space-y-2" style={{ borderColor: "var(--border)" }}>
      <div className="flex items-start justify-between gap-3">
        {note ? (
          <p className="text-sm break-words min-w-0" style={{ color: "var(--text-secondary)" }}>
            <span className="font-semibold">Organiser&apos;s note:</span>{" "}
            {note.split(URL_RE).map((part, i) =>
              /^https?:\/\//.test(part) ? (
                <a key={i} href={part} target="_blank" rel="noopener noreferrer nofollow"
                  className="underline text-amber-600 break-all">
                  {part}
                </a>
              ) : (
                <span key={i}>{part}</span>
              )
            )}
          </p>
        ) : (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>No organiser&apos;s note yet.</p>
        )}
        {isOwner && (
          <button onClick={() => { setValue(note); setEditing(true); }}
            className="text-xs font-semibold text-amber-500 hover:text-amber-600 flex-shrink-0">
            {note ? "Edit" : "Add"}
          </button>
        )}
      </div>
      {firstLink && (
        <button onClick={copyLink}
          className="h-9 px-3 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700">
          Copy link
        </button>
      )}
    </div>
  );
}
