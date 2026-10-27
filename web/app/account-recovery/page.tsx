"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type AccountLifecycle = {
  lifecycle_state: "ACTIVE" | "PAUSED" | "PENDING_DELETION" | "DELETED";
  deletion_recovery_deadline_at: string | null;
  account_status: string;
};

export default function AccountRecoveryPage() {
  const router = useRouter();
  const [account, setAccount] = useState<AccountLifecycle | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadAccount() {
      const supabase = createClient();
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (!mounted) return;

      if (authError || !authData.user) {
        setSignedIn(false);
        setLoading(false);
        return;
      }

      setSignedIn(true);
      const { data, error: accountError } = await supabase
        .from("users")
        .select("lifecycle_state, deletion_recovery_deadline_at, account_status")
        .eq("id", authData.user.id)
        .maybeSingle();

      if (!mounted) return;
      if (accountError || !data) {
        setError("We couldn't verify this account's recovery status. Please try again.");
      } else {
        setAccount(data as AccountLifecycle);
      }
      setLoading(false);
    }

    void loadAccount();
    return () => {
      mounted = false;
    };
  }, []);

  async function reactivateAccount() {
    setBusy(true);
    setError(null);
    setSuccess(null);

    const supabase = createClient();
    const { error: recoveryError } = await supabase.rpc("recover_inactive_account");
    if (recoveryError) {
      setError(
        recoveryError.message.includes("recovery window has expired")
          ? "The 30-day recovery window has expired. This account can no longer be recovered through self-service."
          : "We couldn't reactivate this account. Please try again or contact Hi!Book support.",
      );
      setBusy(false);
      return;
    }

    setSuccess("Your account has been reactivated. Welcome back!");
    router.replace("/community");
    router.refresh();
  }

  if (loading) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-xl items-center justify-center px-4">
        <p role="status" className="text-sm text-[var(--text-secondary)]">Checking your account status…</p>
      </main>
    );
  }

  if (!signedIn) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-xl flex-col justify-center px-4 py-12">
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-semibold text-[var(--foreground)]">Recover your Hi!Book account</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
            Sign in with your usual account credentials or identity provider to verify ownership and continue recovery.
          </p>
          <Link href="/login?next=%2Faccount-recovery" className="mt-6 inline-flex rounded-xl bg-[var(--brand-primary)] px-4 py-3 text-sm font-semibold text-white">
            Sign in to continue
          </Link>
        </section>
      </main>
    );
  }

  if (account?.lifecycle_state === "ACTIVE") {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-xl flex-col justify-center px-4 py-12">
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-semibold text-[var(--foreground)]">Your account is active</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">There's nothing to recover. You can return to your community.</p>
          <Link href="/community" className="mt-6 inline-flex rounded-xl bg-[var(--brand-primary)] px-4 py-3 text-sm font-semibold text-white">Go to Hi!Book</Link>
        </section>
      </main>
    );
  }

  if (account?.lifecycle_state === "DELETED") {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-xl flex-col justify-center px-4 py-12">
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-semibold text-[var(--foreground)]">This account has been deleted</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">The recovery window has ended and the account is no longer recoverable.</p>
        </section>
      </main>
    );
  }

  const pendingDeletion = account?.lifecycle_state === "PENDING_DELETION";

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-xl flex-col justify-center px-4 py-12">
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--brand-primary-dark)]">Account recovery</p>
        <h1 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
          {pendingDeletion ? "Your account is scheduled for deletion" : "Your account is paused"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
          {pendingDeletion
            ? "Your profile is hidden from other people while deletion is pending. You can recover your account before the deadline shown below."
            : "Your account was paused after a long period without a login. Your profile and retained information remain in place. Reactivate to resume normal activity."}
        </p>
        {pendingDeletion && account?.deletion_recovery_deadline_at && (
          <p className="mt-4 rounded-xl bg-[var(--surface-secondary)] p-4 text-sm text-[var(--foreground)]">
            Recovery deadline: <strong>{new Date(account.deletion_recovery_deadline_at).toLocaleString()}</strong>
          </p>
        )}
        {error && <p role="alert" className="mt-4 rounded-xl bg-[var(--error)]/10 p-3 text-sm text-[var(--error)]">{error}</p>}
        {success && <p role="status" className="mt-4 rounded-xl bg-[var(--success)]/10 p-3 text-sm text-[var(--success)]">{success}</p>}
        <button
          type="button"
          onClick={() => void reactivateAccount()}
          disabled={busy}
          className="mt-6 inline-flex rounded-xl bg-[var(--brand-primary)] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? "Verifying and restoring…" : "Verify and reactivate account"}
        </button>
      </section>
    </main>
  );
}
