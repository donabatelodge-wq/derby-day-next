"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

// Only allow same-site relative paths, so ?next= can't bounce someone elsewhere.
function getNext(): string | null {
  if (typeof window === "undefined") return null;
  const n = new URLSearchParams(window.location.search).get("next");
  return n && n.startsWith("/") && !n.startsWith("//") ? n : null;
}

// Pick a "go to your inbox" link from the email's domain. Returns null for
// domains we don't recognise (work addresses etc.) — we just skip the button.
function getMailLink(email: string): { label: string; href: string } | null {
  const domain = email.split("@")[1]?.trim().toLowerCase() ?? "";
  const isIphone = typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);

  if (["gmail.com", "googlemail.com"].includes(domain))
    return { label: "Open Gmail", href: "https://mail.google.com/mail/u/0/#inbox" };
  if (["outlook.com", "hotmail.com", "hotmail.co.uk", "live.com", "live.ie", "msn.com", "outlook.ie"].includes(domain))
    return { label: "Open Outlook", href: "https://outlook.live.com/mail/0/inbox" };
  if (["icloud.com", "me.com", "mac.com"].includes(domain))
    // On iPhone, message:// opens the Mail app directly; elsewhere use iCloud web mail.
    return isIphone
      ? { label: "Open Mail", href: "message://" }
      : { label: "Open iCloud Mail", href: "https://www.icloud.com/mail" };
  if (["yahoo.com", "yahoo.co.uk", "yahoo.ie", "ymail.com"].includes(domain))
    return { label: "Open Yahoo Mail", href: "https://mail.yahoo.com/d/folders/1" };
  return null;
}

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [resendMsg, setResendMsg] = useState<string | null>(null);

  const redirectUrl = () => {
    const next = getNext();
    // After they click the confirmation link they land back on the invite.
    return `${window.location.origin}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ""}`;
  };

  const emailsMatch = email.trim().toLowerCase() === confirmEmail.trim().toLowerCase();

  const handleSignup = async () => {
    if (!emailsMatch) {
      setError("The two email addresses don't match — please check for typos.");
      return;
    }
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: redirectUrl(),
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setDone(true);
    }
  };

  const handleResend = async () => {
    setResendMsg(null);
    const supabase = createClient();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email.trim(),
      options: { emailRedirectTo: redirectUrl() },
    });
    if (error) {
      // Supabase allows one email per address per minute — say so in plain words.
      setResendMsg(
        /seconds|rate limit/i.test(error.message)
          ? "Just sent one — give it a minute, then try again."
          : error.message
      );
    } else {
      setResendMsg("Sent again — check your inbox and Junk folder.");
    }
  };

  const next = getNext();
  const loginHref = next ? `/login?next=${encodeURIComponent(next)}` : "/login";

  const shellStyle = {
    background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f4c2a 100%)",
    paddingTop: "calc(1.5rem + var(--safe-top, 0px))",
    paddingBottom: "calc(1.5rem + var(--safe-bottom, 0px))",
    paddingLeft: "var(--safe-left, 0px)",
    paddingRight: "var(--safe-right, 0px)",
  };

  if (done) {
    const mailLink = getMailLink(email);
    const isIcloud = ["icloud.com", "me.com", "mac.com"].includes(email.split("@")[1]?.trim().toLowerCase() ?? "");
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-5" style={shellStyle}>
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-5xl mb-5"
              style={{ background: "rgba(34,197,94,0.15)", border: "2px solid rgba(34,197,94,0.4)" }}>
              ✉️
            </div>
            <h1 className="text-3xl font-black text-white mb-2">Check your email</h1>
            <p className="text-slate-300 text-sm">
              We sent a confirmation link to
            </p>
            <p className="text-green-400 font-bold text-lg break-all mt-1">{email.trim()}</p>
            <p className="text-slate-300 text-sm mt-1">Click it to activate your account.</p>
            <button
              onClick={() => { setDone(false); setConfirmEmail(""); setResendMsg(null); }}
              className="mt-3 text-sm text-slate-400 underline">
              Wrong address? Go back
            </button>
          </div>

          <div className="w-full rounded-3xl px-7 py-8 bg-white shadow-2xl space-y-3">
            {mailLink && (
              <a href={mailLink.href} target="_blank" rel="noopener noreferrer"
                className="block w-full h-14 rounded-xl text-white font-bold text-base text-center leading-[3.5rem] transition-all active:scale-95"
                style={{ background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)" }}>
                📬 {mailLink.label}
              </a>
            )}

            <p className="text-sm text-slate-500 text-center pt-1">
              {isIcloud ? (
                <>
                  iCloud often puts our email in <span className="font-semibold">Junk</span>. Open Junk, find the
                  email from Derby Day and tap <span className="font-semibold">Not Junk</span>.
                </>
              ) : (
                <>
                  Can&apos;t see it? Check your <span className="font-semibold">Junk / Spam</span> folder — it&apos;s from Derby Day.
                </>
              )}
            </p>

            <button
              onClick={handleResend}
              className="block w-full h-12 rounded-xl border-2 border-slate-200 text-slate-700 font-bold text-sm transition-all active:scale-95">
              Resend email
            </button>

            {resendMsg && <p className="text-xs text-center text-slate-500">{resendMsg}</p>}

            <p className="text-center text-sm text-slate-500 pt-2">
              Already confirmed?{" "}
              <Link href={loginHref} className="text-green-600 font-bold hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5" style={shellStyle}>
      <div className="w-full max-w-md">

        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-4xl mb-4"
            style={{ background: "rgba(34,197,94,0.15)", border: "2px solid rgba(34,197,94,0.4)" }}>
            🏇
          </div>
          <h1 className="text-3xl font-black text-white mb-1 tracking-tight">Derby Day</h1>
          <p className="text-green-400 text-sm font-medium">Horse Racing &amp; Football Competitions</p>
        </div>

        <div className="w-full rounded-3xl px-7 py-8 bg-white shadow-2xl">

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
                placeholder="Your name"
                className="w-full h-14 rounded-xl border border-slate-200 px-4 text-base focus:outline-none focus:ring-2 focus:ring-green-400 bg-slate-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full h-14 rounded-xl border border-slate-200 px-4 text-base focus:outline-none focus:ring-2 focus:ring-green-400 bg-slate-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirm email</label>
              <input
                type="email"
                value={confirmEmail}
                onChange={e => setConfirmEmail(e.target.value)}
                onPaste={e => e.preventDefault()}
                placeholder="Type your email again"
                className="w-full h-14 rounded-xl border border-slate-200 px-4 text-base focus:outline-none focus:ring-2 focus:ring-green-400 bg-slate-50"
              />
              {confirmEmail && !emailsMatch && (
                <p className="text-xs text-red-600 mt-1.5">Emails don&apos;t match yet</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                onKeyDown={e => e.key === "Enter" && name.trim() && handleSignup()}
                className="w-full h-14 rounded-xl border border-slate-200 px-4 text-base focus:outline-none focus:ring-2 focus:ring-green-400 bg-slate-50"
              />
            </div>

            <button
              onClick={handleSignup}
              disabled={loading || !email || !confirmEmail || !emailsMatch || !password || !name}
              className="w-full h-14 rounded-xl text-white font-bold text-base disabled:opacity-50 transition-all active:scale-95"
              style={{ background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)" }}
            >
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </div>

          <p className="text-center text-sm text-slate-500 mt-6">
            Already have an account?{" "}
            <Link href={loginHref} className="text-green-600 font-bold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
