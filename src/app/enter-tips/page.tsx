import { Suspense } from "react";
import EnterTipsContent from "./enter-tips-content";

export default function EnterTipsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <EnterTipsContent />
    </Suspense>
  );
}
