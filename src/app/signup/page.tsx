"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSignup = async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setDone(true);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f4c2a 100%)" }}>
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-5xl mb-6"
            style={{ background: "rgba(34,197,94,0.15)", border: "2px solid rgba(34,197,94,0.4)" }}>
            ✉️
          </div>
          <h1 className="text-3xl font-black text-white mb-2">Check your email</h1>
          <p className="text-slate-300 text-sm text-center mt-2">
            We sent a confirmation link to <span className="text-green-400 font-semibold">{email}</span>. Click it to activate your account.
          </p>
        </div>
        <div className="w-full rounded-t-3xl px-6 pt-8 pb-6 bg-white"
          style={{ paddingBottom: "calc(4.5rem + env(safe-area-inset-bottom))" }}>
          <Link href="/login"
            className="block w-full h-12 rounded-xl text-white font-bold text-base text-center leading-[3rem] transition-all active:scale-95"
            style={{ background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)" }}>
            Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f4c2a 100%)" }}>

      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-16 pb-8">
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-5xl mb-6"
          style={{ background: "rgba(34,197,94,0.15)", border: "2px solid rgba(34,197,94,0.4)" }}>
          🏇
        </div>
        <h1 className="text-4xl font-black text-white mb-2 tracking-tight">Derby Day</h1>
        <p className="text-green-400 text-sm font-medium">Horse Racing &amp; Football Competitions</p>
      </div>

      <div className="w-full rounded-t-3xl px-6 pt-8 pb-6 bg-white"
        style={{ paddingBottom: "calc(4.5rem + env(safe-area-inset-bottom))" }}>

        <h2 className="text-2xl font-bold text-slate-900 mb-1">Create Account</h2>
        <p className="text-sm text-slate-500 mb-6">Join Derby Day — it&apos;s free to sign up</p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Your name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Jim Byrne"
              className="w-full h-12 rounded-xl border border-slate-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-slate-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full h-12 rounded-xl border border-slate-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-slate-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              onKeyDown={e => e.key === "Enter" && name.trim() && handleSignup()}
              className="w-full h-12 rounded-xl border border-slate-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-slate-50"
            />
          </div>

          <button
            onClick={handleSignup}
            disabled={loading || !email || !password || !name}
            className="w-full h-12 rounded-xl text-white font-bold text-base disabled:opacity-50 transition-all active:scale-95"
            style={{ background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)" }}
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </div>

        <p className="text-center text-sm text-slate-500 mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-green-600 font-bold hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
