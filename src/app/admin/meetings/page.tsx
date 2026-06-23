import { Suspense } from "react";
import AdminMeetingsContent from "./admin-meetings-content";

export default function AdminMeetingsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <div className="w-8 h-8 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <AdminMeetingsContent />
    </Suspense>
  );
}
