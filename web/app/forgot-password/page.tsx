"use client";

import Link from "next/link";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import HiBookLogo from "@/components/brand/HiBookLogo";
import HBButton from "@/components/ui/HBButton";
import HBInput from "@/components/ui/HBInput";

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

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setMessage("If an account exists for that email, a password-reset link has been sent.");
  }

  return (
    <main className="min-h-screen bg-[var(--background)] px-5 py-10 text-[var(--foreground)] sm:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-lg)] lg:grid-cols-[0.9fr_1.1fr]">
        <section className="relative hidden overflow-hidden bg-[var(--brand-primary-dark)] p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">
          <div className="absolute inset-0" aria-hidden="true">
            <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-[var(--brand-primary)]/25 blur-3xl" />
            <div className="absolute -bottom-32 -right-20 h-96 w-96 rounded-full border border-[var(--brand-accent)]/15" />
          </div>
          <div className="relative">
            <Link href="/" className="inline-flex items-center gap-3 text-sm font-black">
              <HiBookLogo className="h-10 w-10 text-white" compact aria-hidden="true" />
              Hi!Book
            </Link>
            <p className="mt-20 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--brand-accent)]">Account recovery</p>
            <h2 className="mt-4 max-w-xl text-4xl font-black leading-tight tracking-[-0.06em] xl:text-5xl">A small step back to your community.</h2>
            <p className="mt-5 max-w-lg text-base leading-7 text-white/60">We&apos;ll help regain access without exposing whether a particular email address belongs to an account.</p>
          </div>
          <div className="relative rounded-[var(--radius-lg)] border border-white/10 bg-white/5 p-5">
            <div className="flex items-center gap-3">
              <LockKeyhole className="h-5 w-5 text-[var(--brand-accent)]" aria-hidden="true" />
              <p className="text-sm font-semibold">Privacy-aware recovery</p>
            </div>
            <p className="mt-2 text-sm leading-6 text-white/50">The recovery response is intentionally generic so account existence is not disclosed.</p>
          </div>
        </section>

        <section className="flex items-center px-5 py-10 sm:px-10 lg:px-14">
          <div className="mx-auto w-full max-w-md">
            <Link href="/login" className="group inline-flex items-center gap-2 text-sm font-semibold text-[var(--muted)] transition hover:text-[var(--foreground)]">
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" aria-hidden="true" />
              Back to sign in
            </Link>
            <p className="mt-10 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--brand-primary-dark)]">Account recovery</p>
            <h1 className="mt-3 text-4xl font-black tracking-[-0.06em] sm:text-5xl">Reset your password.</h1>
            <p className="mt-4 text-sm leading-6 text-[var(--muted)]">Enter your email and we&apos;ll send you a secure reset link.</p>

            <form onSubmit={submit} className="mt-8 space-y-5">
              <label className="block">
                <span className="text-sm font-semibold">Email address</span>
                <HBInput
                  required
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="mt-2"
                />
              </label>
              {error && (
                <p role="alert" className="rounded-[var(--radius-lg)] border border-[var(--error)]/20 bg-[var(--error)]/10 px-4 py-3 text-sm leading-6 text-[var(--error)]">{error}</p>
              )}
              {message && (
                <p role="status" className="rounded-[var(--radius-lg)] border border-[var(--success)]/20 bg-[var(--success)]/10 px-4 py-3 text-sm leading-6 text-[var(--success)]">{message}</p>
              )}
              <HBButton type="submit" disabled={loading} className="w-full">
                {loading ? "Sending…" : "Send reset link"}
              </HBButton>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
