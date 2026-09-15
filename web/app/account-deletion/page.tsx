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
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-950 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-4xl">
        <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-white shadow-2xl shadow-black/30">
          <div className="relative overflow-hidden bg-slate-950 px-6 py-8 text-white sm:px-10 sm:py-10">
            <div className="absolute -right-24 -top-28 h-64 w-64 rounded-full bg-amber-300/20 blur-3xl" aria-hidden="true" />
            <div className="absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" aria-hidden="true" />
            <div className="relative">
              <button
                type="button"
                onClick={() => router.push("/profile")}
                className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-amber-300/70"
              >
                <span aria-hidden="true">←</span>
                Back to profile
              </button>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-200">Account lifecycle</p>
              <h1 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">Your account, on your terms.</h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                Manage a scheduled deletion request during its grace period. Cancelling the request keeps your Hi!Book account active.
              </p>
            </div>
          </div>

          <div className="grid gap-8 p-6 sm:p-10 lg:grid-cols-[1fr_0.72fr]">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-sm font-bold text-amber-200" aria-hidden="true">
                  H!
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-950">Deletion status</p>
                  <p className="text-xs text-slate-500">Only an active scheduled request is shown here.</p>
                </div>
              </div>

              {loading ? (
                <div className="mt-8 space-y-3" aria-label="Loading deletion status">
                  <div className="h-5 w-40 animate-pulse rounded-full bg-slate-200" />
                  <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
                  <div className="h-12 w-52 animate-pulse rounded-xl bg-slate-200" />
                </div>
              ) : scheduled ? (
                <div className="mt-8">
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-800" aria-hidden="true">
                        !
                      </span>
                      <div>
                        <p className="font-semibold text-amber-950">Deletion is scheduled</p>
                        <p className="mt-1 text-sm leading-6 text-amber-900/80">
                          Your account is currently in its deletion grace period. You can cancel this request before the scheduled date.
                        </p>
                      </div>
                    </div>
                    <p className="mt-4 rounded-xl bg-white/70 px-4 py-3 text-sm font-semibold text-amber-950">
                      Scheduled for {new Date(scheduled).toLocaleString()}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => void cancelDeletion()}
                    disabled={busy}
                    className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {busy ? "Cancelling…" : "Cancel deletion request"}
                  </button>
                </div>
              ) : (
                <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                  <p className="font-semibold text-emerald-950">Your account is active</p>
                  <p className="mt-1 text-sm leading-6 text-emerald-900/80">
                    There is no active deletion request for this account.
                  </p>
                  <button
                    type="button"
                    onClick={() => router.push("/profile")}
                    className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl border border-emerald-300 bg-white px-5 py-2.5 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                  >
                    Return to profile
                  </button>
                </div>
              )}

              {error && (
                <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
                  {error}
                </p>
              )}
              {success && (
                <p role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-700">
                  {success}
                </p>
              )}
            </div>

            <aside className="rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">What happens next</p>
              <div className="mt-5 space-y-5">
                <div className="flex gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xs font-bold text-white">1</span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Grace period</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">Your scheduled request remains reversible until the deletion date.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xs font-bold text-white">2</span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Cancel if you change your mind</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">Use the cancellation control while the request is still scheduled.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xs font-bold text-white">3</span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Need help?</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">Return to your profile to review your account and privacy settings.</p>
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
