"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CheckCircle, Trophy } from "lucide-react";
import Link from "next/link";

// The webhook activates the group ('pending_payment' -> 'active') asynchronously,
// so it may not have landed the instant Stripe redirects back here. Poll briefly
// rather than assuming it's already done or showing a false failure.
const POLL_INTERVAL_MS = 1500;
const MAX_POLLS = 10; // ~15 seconds

export default function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();
  const groupId = searchParams.get("groupId");
  const kind = searchParams.get("kind") === "upgrade" ? "upgrade" : "initial";
  const expectMaxPlayers = Number(searchParams.get("expectMaxPlayers") || 0) || null;

  const [status, setStatus] = useState<"checking" | "active" | "timeout" | "not_found">("checking");
  const [groupName, setGroupName] = useState("");
  const [pollCount, setPollCount] = useState(0);

  useEffect(() => {
    if (!groupId) { setStatus("not_found"); return; }
    let cancelled = false;

    const check = async () => {
      const { data } = await supabase.from("groups").select("name, status, max_players").eq("id", groupId).single();
      if (cancelled) return;
      if (!data) { setStatus("not_found"); return; }
      setGroupName(data.name);
      const done = kind === "upgrade" && expectMaxPlayers
        ? data.max_players >= expectMaxPlayers
        : data.status === "active";
      if (done) {
        setStatus("active");
        return;
      }
      setPollCount(c => {
        const next = c + 1;
        if (next >= MAX_POLLS) {
          setStatus("timeout");
        } else {
          setTimeout(check, POLL_INTERVAL_MS);
        }
        return next;
      });
    };
    check();

    return () => { cancelled = true; };
  }, [groupId]);

  if (status === "checking") return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center" style={{ background: "var(--bg)" }}>
      <div className="w-8 h-8 border-2 border-green-400 border-t-transparent rounded-full animate-spin mb-4" />
      <p style={{ color: "var(--text-muted)" }}>Confirming your payment...</p>
    </div>
  );

  if (status === "not_found") return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center" style={{ background: "var(--bg)" }}>
      <p style={{ color: "var(--text-muted)" }}>Something went wrong finding your competition. If you were charged, contact support and we'll sort it out.</p>
      <Link href="/my-competitions" className="text-sm underline mt-4" style={{ color: "var(--text-muted)" }}>Back to My Competitions</Link>
    </div>
  );

  if (status === "timeout") return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center" style={{ background: "var(--bg)" }}>
      <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
        <Trophy className="w-8 h-8 text-amber-500" />
      </div>
      <h2 className="text-2xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>Payment received, still setting up</h2>
      <p className="mb-6 max-w-sm" style={{ color: "var(--text-muted)" }}>
        This is taking longer than usual to confirm. Your payment went through — refresh in a moment to check again.
      </p>
      <button onClick={() => { setStatus("checking"); setPollCount(0); }}
        className="px-6 py-3 rounded-2xl bg-slate-900 text-white text-sm font-semibold">
        Check again
      </button>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center" style={{ background: "var(--bg)" }}>
      <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
        <CheckCircle className="w-8 h-8 text-emerald-500" />
      </div>
      <h2 className="text-2xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
        {kind === "upgrade" ? `${groupName} is upgraded!` : `${groupName} is ready!`}
      </h2>
      <p className="mb-6" style={{ color: "var(--text-muted)" }}>
        {kind === "upgrade"
          ? `Payment confirmed — the player limit is now ${expectMaxPlayers}.`
          : "Payment confirmed — your competition is live and ready for players to join."}
      </p>
      <button onClick={() => router.push(`/group/${groupId}`)}
        className="px-6 py-3 rounded-2xl text-white text-sm font-semibold"
        style={{ background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)" }}>
        Go to your competition
      </button>
    </div>
  );
}
