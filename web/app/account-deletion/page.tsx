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
    return () => { active = false; };
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
      setSuccess("Your deletion request has been cancelled and your account is active again.");
    }
    setBusy(false);
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Account lifecycle</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Account deletion</h1>
        {loading ? (
          <p className="mt-5 text-sm text-slate-500">Checking your deletion request…</p>
        ) : scheduled ? (
          <>
            <p className="mt-5 text-sm leading-6 text-slate-700">
              Your account is scheduled for deletion. During the grace period you can cancel the request and restore your account.
            </p>
            <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
              Scheduled for {new Date(scheduled).toLocaleString()}
            </p>
            <button type="button" onClick={() => void cancelDeletion()} disabled={busy} className="mt-6 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">
              {busy ? "Cancelling…" : "Cancel deletion request"}
            </button>
          </>
        ) : (
          <>
            <p className="mt-5 text-sm leading-6 text-slate-700">There is no active deletion request for this account.</p>
            <button type="button" onClick={() => router.push("/profile")} className="mt-6 rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50">
              Return to profile
            </button>
          </>
        )}
        {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        {success && <p role="status" className="mt-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</p>}
      </section>
    </main>
  );
}
