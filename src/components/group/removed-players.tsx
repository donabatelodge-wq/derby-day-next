"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";

// Organiser-only list of players removed from the group, with a Reinstate
// button. Their saved selections are never deleted, so reinstating brings
// their points straight back. Reinstated players come back unticked (Unpaid).
export function RemovedPlayers({ group, onGroupUpdate }: {
  group: any;
  onGroupUpdate: (u: any) => void;
}) {
  const supabase = createClient();
  const [busy, setBusy] = useState<string | null>(null);

  const removed: Record<string, { name?: string; removed_at?: string }> = group.removed_members || {};
  const emails = Object.keys(removed);
  if (emails.length === 0) return null;

  const members: string[] = group.member_emails || [];
  const full = group.max_players != null && members.length >= group.max_players;

  const removedLabel = (iso?: string) => {
    if (!iso) return "";
    try { return format(new Date(iso), "d MMM, HH:mm"); } catch { return ""; }
  };

  const reinstate = async (email: string) => {
    if (full) {
      toast.error("Your group is full. Raise the player limit first.");
      return;
    }
    setBusy(email);
    const name = removed[email]?.name || email.split("@")[0];
    const nextRemoved = { ...removed };
    delete nextRemoved[email];
    const nextEmails = members.includes(email) ? members : [...members, email];
    const nextNames = { ...(group.member_names || {}), [email]: name };
    const { error } = await supabase
      .from("groups")
      .update({ member_emails: nextEmails, member_names: nextNames, removed_members: nextRemoved } as any)
      .eq("id", group.id);
    setBusy(null);
    if (error) {
      toast.error("Couldn't reinstate. Please try again.");
      return;
    }
    onGroupUpdate({ member_emails: nextEmails, member_names: nextNames, removed_members: nextRemoved });
    toast.success(`${name} reinstated. Tick them as Paid once they've paid you.`);
  };

  return (
    <div className="rounded-3xl border overflow-hidden" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
      <div className="px-6 py-5 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-green-500" />
          <h2 className="font-semibold text-base" style={{ color: "var(--text-primary)" }}>Removed players ({emails.length})</h2>
        </div>
        <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
          Removed players can&apos;t rejoin by themselves. Reinstate brings them back with their saved selections and points.
        </p>
      </div>
      <div className="divide-y" style={{ borderColor: "var(--border)" }}>
        {emails.map(email => (
          <div key={email} className="px-6 py-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-base font-medium" style={{ color: "var(--text-primary)" }}>
                {removed[email]?.name || email.split("@")[0]}
              </p>
              <p className="text-sm text-slate-400 truncate">{email}</p>
              {removed[email]?.removed_at && (
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Removed {removedLabel(removed[email].removed_at)}</p>
              )}
            </div>
            <button onClick={() => reinstate(email)} disabled={busy === email}
              className="text-xs px-3 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold whitespace-nowrap disabled:opacity-50 flex-shrink-0">
              {busy === email ? "..." : "Reinstate"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
