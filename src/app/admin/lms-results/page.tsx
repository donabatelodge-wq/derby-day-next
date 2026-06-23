import { Suspense } from "react";
import AdminLmsResultsContent from "./admin-lms-results-content";

export default function AdminLmsResultsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <div className="w-8 h-8 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <AdminLmsResultsContent />
    </Suspense>
  );
}
