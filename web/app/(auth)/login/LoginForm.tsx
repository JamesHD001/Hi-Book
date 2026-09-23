"use client";

import Link from "next/link";
import { Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import HBButton from "@/components/ui/HBButton";
import HBInput from "@/components/ui/HBInput";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const confirmationError = searchParams.get("error") === "confirmation";
  const resetSuccess = searchParams.get("reset") === "success";

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
    <form onSubmit={handleSubmit} className="mt-8 space-y-6">
      {confirmationError && (
        <p role="alert" className="rounded-[var(--radius-lg)] border border-[var(--error)]/20 bg-[var(--error)]/10 px-4 py-3 text-sm leading-6 text-[var(--error)]">
          That confirmation link is invalid or has expired. Request a new one or sign in again.
        </p>
      )}

      {resetSuccess && (
        <p role="status" className="rounded-[var(--radius-lg)] border border-[var(--success)]/20 bg-[var(--success)]/10 px-4 py-3 text-sm leading-6 text-[var(--success)]">
          Your password has been updated. Sign in with your new password.
        </p>
      )}

      <label className="hb-field">
        <span className="hb-label">Email address</span>
        <div className="relative mt-2">
          <Mail className="pointer-events-none absolute left-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" aria-hidden="true" />
          <HBInput
            required
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className="pl-11"
          />
        </div>
      </label>

      <label className="hb-field">
        <div className="flex items-center justify-between gap-4">
          <span className="hb-label">Password</span>
          <Link href="/forgot-password" className="text-xs font-semibold text-[var(--foreground)] underline decoration-[var(--brand-primary-soft)] underline-offset-4 transition hover:decoration-[var(--brand-primary)] sm:text-sm">
            Forgot password?
          </Link>
        </div>
        <div className="relative mt-2">
          <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" aria-hidden="true" />
          <HBInput
            required
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            className="pl-11 pr-12"
          />
          <button
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="hb-icon-button absolute right-2 top-1/2 h-9 w-9 -translate-y-1/2 border-0 bg-transparent"
          >
            {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
          </button>
        </div>
      </label>

      {error && (
        <p role="alert" className="rounded-[var(--radius-lg)] border border-[var(--error)]/20 bg-[var(--error)]/10 px-4 py-3 text-sm leading-6 text-[var(--error)]">
          {error}
        </p>
      )}

      <HBButton type="submit" disabled={loading} className="w-full hb-button--lg">
        {loading ? "Signing in…" : "Sign in to Hi!Book"}
        {!loading && <span aria-hidden="true">→</span>}
      </HBButton>

      <div className="flex items-center gap-3 py-1" aria-hidden="true">
        <div className="h-px flex-1 bg-[var(--divider)]" />
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">or</span>
        <div className="h-px flex-1 bg-[var(--divider)]" />
      </div>

      <p className="text-center text-sm leading-6 text-[var(--muted)]">
        New to Hi!Book?{" "}
        <Link href="/signup" className="font-semibold text-[var(--foreground)] underline decoration-[var(--brand-primary-soft)] underline-offset-4 transition hover:decoration-[var(--brand-primary)]">
          Create your account
        </Link>
      </p>
    </form>
  );
}
