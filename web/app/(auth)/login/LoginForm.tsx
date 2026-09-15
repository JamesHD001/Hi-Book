"use client";

import Link from "next/link";
import { Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
        <div className="relative mt-2">
          <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            required
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-slate-950 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
          />
        </div>
      </label>

      <label className="block">
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm font-semibold text-slate-800">Password</span>
          <Link href="/forgot-password" className="text-xs font-semibold text-blue-600 transition hover:text-blue-700 hover:underline sm:text-sm">
            Forgot password?
          </Link>
        </div>
        <div className="relative mt-2">
          <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            required
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-12 text-slate-950 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
          />
          <button
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          >
            {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
          </button>
        </div>
      </label>

      {error && (
        <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3.5 font-semibold text-white shadow-lg shadow-slate-950/10 transition hover:-translate-y-0.5 hover:bg-blue-600 hover:shadow-blue-600/20 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:bg-slate-950"
      >
        {loading ? "Signing in…" : "Sign in to Hi!Book"}
        {!loading && <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">→</span>}
      </button>

      <div className="flex items-center gap-3 py-1" aria-hidden="true">
        <div className="h-px flex-1 bg-slate-200" />
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">or</span>
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
