"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AccountDeletionPanel() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function requestDeletion() {
    if (!window.confirm("Schedule your Hi!Book account for deletion? You will have approximately 30 days to cancel.")) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("request_account_deletion");
    if (rpcError) {
      setError(rpcError.message);
    } else {
      setSuccess("Your account is scheduled for deletion. You can cancel the request during the grace period.");
    }
    setBusy(false);
  }

  return (
    <section className="rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm sm:p-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-600">Account lifecycle</p>
        <h2 className="mt-2 text-lg font-semibold text-red-950">Delete your account</h2>
        <p className="mt-2 text-sm leading-6 text-red-800">
          Account deletion is scheduled rather than immediate. Your account is restricted during the approximately 30-day grace period, and you can cancel the request before final deletion.
        </p>
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" onClick={() => void requestDeletion()} disabled={busy} className="rounded-xl bg-red-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60">
          {busy ? "Scheduling…" : "Schedule account deletion"}
        </button>
        <Link href="/account-deletion" className="rounded-xl border border-red-300 bg-white px-4 py-2.5 text-sm font-semibold text-red-800 hover:bg-red-100">
          Manage deletion request
        </Link>
      </div>
      {error && <p role="alert" className="mt-4 rounded-xl bg-white px-4 py-3 text-sm text-red-700">{error}</p>}
      {success && <p role="status" className="mt-4 rounded-xl bg-white px-4 py-3 text-sm text-emerald-700">{success}</p>}
    </section>
  );
}
