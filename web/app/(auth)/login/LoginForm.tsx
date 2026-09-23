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
    <form onSubmit={handleSubmit} className="hb-auth-form">
      {confirmationError && (
        <p role="alert" className="hb-status hb-status--error">
          That confirmation link is invalid or has expired. Request a new one or sign in again.
        </p>
      )}

      {resetSuccess && (
        <p role="status" className="hb-status hb-status--success">
          Your password has been updated. Sign in with your new password.
        </p>
      )}

      <label className="hb-field">
        <span className="hb-label">Email address</span>
        <div className="hb-input-wrap">
          <Mail className="hb-input-icon" aria-hidden="true" />
          <HBInput
            required
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className="hb-input hb-input--with-leading-icon"
          />
        </div>
      </label>

      <label className="block">
        <div className="hb-field__label-row">
          <span className="text-sm font-semibold text-[var(--foreground)]">Password</span>
          <Link href="/forgot-password" className="hb-form-link">
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
            className="hb-input hb-input--with-leading-icon hb-input--with-trailing-icon"
          />
          <button
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="hb-input-action"
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

      <HBButton type="submit" disabled={loading} className="w-full">
        {loading ? "Signing in…" : "Sign in to Hi!Book"}
        {!loading && <span aria-hidden="true">→</span>}
      </HBButton>

      <div className="hb-auth-divider" aria-hidden="true">
        <div className="hb-auth-divider__line" />
        <span className="hb-auth-divider__label">or</span>
        <div className="h-px flex-1 bg-[var(--divider)]" />
      </div>

      <p className="hb-auth-switch">
        New to Hi!Book?{" "}
        <Link href="/signup" className="hb-form-link hb-form-link--strong">
          Create your account
        </Link>
      </p>
    </form>
  );
}
