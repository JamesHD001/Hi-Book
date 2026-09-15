"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    router.replace("/community");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-5">
      <label className="block">
        <span className="text-sm font-semibold text-slate-800">Email address</span>
        <input
          required
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
        />
      </label>

      <label className="block">
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm font-semibold text-slate-800">Password</span>
          <Link href="/forgot-password" className="text-sm font-semibold text-blue-600 transition hover:text-blue-700 hover:underline">
            Forgot password?
          </Link>
        </div>
        <input
          required
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-950 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
        />
      </label>

      {error && (
        <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-2xl bg-slate-950 px-5 py-3.5 font-semibold text-white shadow-lg shadow-slate-950/10 transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
      >
        {loading ? "Signing in…" : "Sign in to Hi!Book"}
      </button>

      <div className="flex items-center gap-3 py-1" aria-hidden="true">
        <div className="h-px flex-1 bg-slate-200" />
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">or</span>
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      <p className="text-center text-sm leading-6 text-slate-500">
        New to Hi!Book?{" "}
        <Link href="/signup" className="font-semibold text-slate-950 underline decoration-slate-300 underline-offset-4 transition hover:decoration-slate-950">
          Create your account
        </Link>
      </p>
    </form>
  );
}
