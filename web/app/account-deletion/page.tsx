"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function AccountDeletionPage() {
  const router = useRouter();
  const [scheduled, setScheduled] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const supabase = createClient();

    void (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        router.replace("/login");
        return;
      }

      const { data, error: queryError } = await supabase
        .from("account_deletion_request")
        .select("scheduled_for")
        .eq("user_id", auth.user.id)
        .eq("status", "SCHEDULED")
        .order("requested_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!active) return;
      if (queryError) setError(queryError.message);
      setScheduled(data?.scheduled_for ?? null);
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [router]);

  async function cancelDeletion() {
    setBusy(true);
    setError(null);
    setSuccess(null);

    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("cancel_account_deletion");

    if (rpcError) {
      setError(rpcError.message);
    } else {
      setScheduled(null);
      setSuccess("Your deletion request has been cancelled. Your account is active again.");
    }

    setBusy(false);
  }

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-8 text-[var(--foreground)] sm:px-6 sm:py-12">
      <div className="mx-auto max-w-4xl">
        <section className="overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--surface)]">
          <div className="relative overflow-hidden bg-[var(--surface-inverse)] px-6 py-8 text-[var(--on-inverse)] sm:px-10 sm:py-10">
            <div className="absolute -right-24 -top-28 h-64 w-64 rounded-full bg-[var(--brand-primary)]/10 blur-3xl" aria-hidden="true" />
            <div className="absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-[var(--brand-primary)]/10 blur-3xl" aria-hidden="true" />
            <div className="relative">
              <button
                type="button"
                onClick={() => router.push("/profile")}
                className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-[var(--on-inverse)] transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/70"
              >
                <span aria-hidden="true">←</span>
                Back to profile
              </button>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--brand-primary)]">Account lifecycle</p>
              <h1 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">Your account, on your terms.</h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
                Manage a scheduled deletion request during its grace period. Cancelling the request keeps your Hi!Book account active.
              </p>
            </div>
          </div>

          <div className="grid gap-8 p-6 sm:p-10 lg:grid-cols-[1fr_0.72fr]">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--surface-inverse)] text-sm font-bold text-[var(--brand-primary)]" aria-hidden="true">
                  H!
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--foreground)]">Deletion status</p>
                  <p className="text-xs text-[var(--text-secondary)]">Only an active scheduled request is shown here.</p>
                </div>
              </div>

              {loading ? (
                <div className="mt-8 space-y-3" aria-label="Loading deletion status">
                  <div className="h-5 w-40 animate-pulse rounded-full bg-[#e7e1d7]" />
                  <div className="h-20 animate-pulse rounded-2xl bg-[#f1ede5]" />
                  <div className="h-12 w-52 animate-pulse rounded-xl bg-[#e7e1d7]" />
                </div>
              ) : scheduled ? (
                <div className="mt-8">
                  <div className="rounded-2xl border border-[#e6c9bf] bg-[#fbebe6] p-5">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-800" aria-hidden="true">
                        !
                      </span>
                      <div>
                        <p className="font-semibold text-[#6f3024]">Deletion is scheduled</p>
                        <p className="mt-1 text-sm leading-6 text-[#8f4d40]">
                          Your account is currently in its deletion grace period. You can cancel this request before the scheduled date.
                        </p>
                      </div>
                    </div>
                    <p className="mt-4 rounded-xl bg-[#fffdf8]/70 px-4 py-3 text-sm font-semibold text-[#6f3024]">
                      Scheduled for {new Date(scheduled).toLocaleString()}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => void cancelDeletion()}
                    disabled={busy}
                    className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-[var(--surface-inverse)] px-6 py-3 text-sm font-semibold text-[var(--on-inverse)] transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {busy ? "Cancelling…" : "Cancel deletion request"}
                  </button>
                </div>
              ) : (
                <div className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--surface-secondary)] p-5">
                  <p className="font-semibold text-[var(--foreground)]">Your account is active</p>
                  <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                    There is no active deletion request for this account.
                  </p>
                  <button
                    type="button"
                    onClick={() => router.push("/profile")}
                    className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-2.5 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:ring-offset-2"
                  >
                    Return to profile
                  </button>
                </div>
              )}

              {error && (
                <p role="alert" className="mt-5 rounded-xl border border-[#e6c9bf] bg-[#fbebe6] px-4 py-3 text-sm leading-6 text-[#8f3d2d]">
                  {error}
                </p>
              )}
              {success && (
                <p role="status" className="mt-5 rounded-xl border border-[#cbd8cf] bg-[#eef5f0] px-4 py-3 text-sm leading-6 text-[#42634d]">
                  {success}
                </p>
              )}
            </div>

            <aside className="rounded-2xl border border-[var(--border)] bg-[var(--surface-secondary)] p-5 sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">What happens next</p>
              <div className="mt-5 space-y-5">
                <div className="flex gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--surface-inverse)] text-xs font-bold text-[var(--on-inverse)]">1</span>
                  <div>
                    <p className="text-sm font-semibold text-[var(--foreground)]">Grace period</p>
                    <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">Your scheduled request remains reversible until the deletion date.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--surface-inverse)] text-xs font-bold text-[var(--on-inverse)]">2</span>
                  <div>
                    <p className="text-sm font-semibold text-[var(--foreground)]">Cancel if you change your mind</p>
                    <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">Use the cancellation control while the request is still scheduled.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--surface-inverse)] text-xs font-bold text-[var(--on-inverse)]">3</span>
                  <div>
                    <p className="text-sm font-semibold text-[var(--foreground)]">Need help?</p>
                    <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">Return to your profile to review your account and privacy settings.</p>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}
