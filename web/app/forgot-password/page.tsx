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
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6 py-12">
      <section className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <Link href="/login" className="text-sm font-semibold text-blue-600">← Back to sign in</Link>
        <h1 className="mt-6 text-3xl font-bold text-gray-950">Reset your password</h1>
        <p className="mt-2 text-sm text-gray-600">Enter your email and we&apos;ll send you a secure reset link.</p>
        <form onSubmit={submit} className="mt-8 space-y-5">
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className="w-full rounded-xl border border-gray-300 px-4 py-3" placeholder="you@example.com" />
          {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          {message && <p role="status" className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">{message}</p>}
          <button disabled={loading} className="w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{loading ? "Sending…" : "Send reset link"}</button>
        </form>
      </section>
    </main>
  );
}
