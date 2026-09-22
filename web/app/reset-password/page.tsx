"use client";

import Link from "next/link";
import { ArrowLeft, Eye, EyeOff, LockKeyhole } from "lucide-react";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import HiBookLogo from "@/components/brand/HiBookLogo";
import HBButton from "@/components/ui/HBButton";
import HBInput from "@/components/ui/HBInput";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Your password must contain at least 8 characters.");
      return;
    }

    if (password !== confirm) {
      setError("The passwords do not match.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    router.replace("/login?reset=success");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-5 py-10 text-[var(--foreground)]">
      <section className="w-full max-w-md rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--surface)] p-7 shadow-[var(--shadow-lg)] sm:p-9">
        <Link href="/" className="inline-flex items-center gap-3 text-sm font-black">
          <HiBookLogo className="h-9 w-9 text-[var(--brand-primary)]" compact aria-hidden="true" />
          Hi!Book
        </Link>
        <p className="mt-10 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--brand-primary-dark)]">Secure recovery</p>
        <h1 className="mt-3 text-4xl font-black tracking-[-0.06em]">Choose a new password.</h1>
        <p className="mt-4 text-sm leading-6 text-[var(--muted)]">Use a password with at least 8 characters.</p>

        <form onSubmit={submit} className="mt-8 space-y-5">
          <label className="block">
            <span className="text-sm font-semibold">New password</span>
            <div className="relative mt-2">
              <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" aria-hidden="true" />
              <HBInput
                required
                minLength={8}
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                placeholder="At least 8 characters"
                className="pl-11 pr-12"
              />
              <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-[var(--radius-md)] text-[var(--muted)] transition hover:bg-[var(--surface-secondary)]">
                {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
              </button>
            </div>
          </label>

          <label className="block">
            <span className="text-sm font-semibold">Confirm new password</span>
            <div className="relative mt-2">
              <HBInput
                required
                minLength={8}
                type={showConfirm ? "text" : "password"}
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                autoComplete="new-password"
                placeholder="Repeat your password"
                className="pr-12"
              />
              <button type="button" onClick={() => setShowConfirm((visible) => !visible)} aria-label={showConfirm ? "Hide password" : "Show password"} className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-[var(--radius-md)] text-[var(--muted)] transition hover:bg-[var(--surface-secondary)]">
                {showConfirm ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
              </button>
            </div>
          </label>

          {error && (
            <p role="alert" className="rounded-[var(--radius-lg)] border border-[var(--error)]/20 bg-[var(--error)]/10 px-4 py-3 text-sm leading-6 text-[var(--error)]">{error}</p>
          )}

          <HBButton type="submit" disabled={loading} className="w-full">
            {loading ? "Updating…" : "Update password"}
          </HBButton>
        </form>

        <Link href="/login" className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-[var(--muted)] transition hover:text-[var(--foreground)]">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to sign in
        </Link>
      </section>
    </main>
  );
}
