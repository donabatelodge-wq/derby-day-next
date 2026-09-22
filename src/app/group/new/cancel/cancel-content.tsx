"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { XCircle } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function CancelContent() {
  const searchParams = useSearchParams();
  const groupId = searchParams.get("groupId");
  const kind = searchParams.get("kind") === "upgrade" ? "upgrade" : "initial";
  const [retrying, setRetrying] = useState(false);

  // The group already exists (either 'pending_payment' from a fresh create,
  // or 'active' and just short of its next pack tier) — no need to redo the
  // wizard, just start a new Checkout Session of the same kind and send them
  // back to Stripe.
  const handleRetry = async () => {
    if (!groupId) return;
    setRetrying(true);
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId, kind }),
    });
    const data = await res.json();
    if (!res.ok || !data.url) {
      toast.error(data.error || "Couldn't restart payment. Please try again.");
      setRetrying(false);
      return;
    }
    window.location.href = data.url;
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center" style={{ background: "var(--bg)" }}>
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
        <XCircle className="w-8 h-8 text-red-400" />
      </div>
      <h2 className="text-2xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>Payment Cancelled</h2>
      <p className="mb-6 max-w-sm" style={{ color: "var(--text-muted)" }}>
        {kind === "upgrade"
          ? "No charge was made and your player limit is unchanged. You can try again below."
          : <>No charge was made and your competition hasn&apos;t been created yet. You can try paying again, or start over.</>}
      </p>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        {groupId && (
          <button onClick={handleRetry} disabled={retrying}
            className="w-full h-12 rounded-2xl text-white text-sm font-semibold disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)" }}>
            {retrying ? "Redirecting..." : "Try Payment Again"}
          </button>
        )}
        {kind === "upgrade" && groupId ? (
          <Link href={`/group/${groupId}`} className="text-sm underline" style={{ color: "var(--text-muted)" }}>Back to your competition</Link>
        ) : (
          <Link href="/group/new" className="text-sm underline" style={{ color: "var(--text-muted)" }}>Start over</Link>
        )}
        <Link href="/my-competitions" className="text-sm underline" style={{ color: "var(--text-muted)" }}>Back to My Competitions</Link>
      </div>
    </div>
  );
}
