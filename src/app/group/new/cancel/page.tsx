import { Suspense } from "react";
import CancelContent from "./cancel-content";

export default function GroupPaymentCancelPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <CancelContent />
    </Suspense>
  );
}
