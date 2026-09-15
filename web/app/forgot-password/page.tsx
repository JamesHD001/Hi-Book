"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (resetError) return setError(resetError.message);
    setMessage("If an account exists for that email, a password-reset link has been sent.");
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl overflow-hidden rounded-[2rem] border border-white/10 bg-white shadow-2xl shadow-black/30 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="relative hidden overflow-hidden bg-slate-950 p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(59,130,246,0.35),transparent_34%),radial-gradient(circle_at_80%_80%,rgba(168,85,247,0.24),transparent_38%)]" />
          <div className="relative">
            <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.2em] text-white">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-sm font-black text-slate-950">H!</span>
              Hi!Book
            </Link>
            <p className="mt-20 max-w-md text-sm font-semibold uppercase tracking-[0.18em] text-blue-300">Account recovery</p>
            <h2 className="mt-4 max-w-xl text-4xl font-bold leading-tight tracking-tight xl:text-5xl">A small step back to your community.</h2>
            <p className="mt-5 max-w-lg text-base leading-7 text-slate-300">We&apos;ll help you regain access without exposing whether a particular email address belongs to an account.</p>
          </div>
          <div className="relative rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
            <p className="text-sm font-semibold text-white">Privacy-aware recovery</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">The recovery response is intentionally generic so account existence is not disclosed.</p>
          </div>
        </section>

        <section className="flex items-center bg-white px-6 py-10 sm:px-10 lg:px-14">
          <div className="mx-auto w-full max-w-md">
            <Link href="/login" className="inline-flex text-sm font-semibold text-slate-500 transition hover:text-slate-950">← Back to sign in</Link>
            <p className="mt-10 text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">Account recovery</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Reset your password.</h1>
            <p className="mt-3 text-sm leading-6 text-slate-500">Enter your email and we&apos;ll send you a secure reset link.</p>

            <form onSubmit={submit} className="mt-8 space-y-5">
              <label className="block">
                <span className="text-sm font-semibold text-slate-800">Email address</span>
                <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-950 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10" placeholder="you@example.com" />
              </label>
              {error && <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">{error}</p>}
              {message && <p role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-700">{message}</p>}
              <button type="submit" disabled={loading} className="w-full rounded-2xl bg-slate-950 px-5 py-3.5 font-semibold text-white shadow-lg shadow-slate-950/10 transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0">
                {loading ? "Sending…" : "Send reset link"}
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
