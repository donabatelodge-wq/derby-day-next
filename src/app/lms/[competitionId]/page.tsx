import { Suspense } from "react";
import LmsContent from "./lms-content";

export default function LmsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <div className="w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <LmsContent />
    </Suspense>
  );
}
