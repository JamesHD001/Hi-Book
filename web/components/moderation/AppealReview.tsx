"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Appeal = {
  appeal_id: string;
  case_id: string;
  case_number: string;
  action_id: string;
  appellant_id: string;
  target_type: string;
  target_id: string;
  action_type: string;
  action_reason: string;
  appeal_reason: string;
  status: string;
  created_at: string;
  reviewed_by?: string | null;
  resolved_at?: string | null;
  resolution?: string | null;
};

const OPEN_APPEAL_STATUSES = new Set(["SUBMITTED", "IN_REVIEW"]);

export default function AppealReview({ initialAppeal }: { initialAppeal: Appeal }) {
  const supabase = createClient();
  const router = useRouter();
  const [appeal, setAppeal] = useState(initialAppeal);
  const [decision, setDecision] = useState<"UPHELD" | "REVERSED" | "PARTIALLY_REVERSED" | "CLOSED">("UPHELD");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canReview = OPEN_APPEAL_STATUSES.has(appeal.status);

  async function review() {
    if (!canReview) return;
    if (reason.trim().length < 10) {
      setError("A decision reason of at least 10 characters is required.");
      return;
    }
    setBusy(true);
    setError(null);
    const { error: rpcError } = await supabase.rpc("review_moderation_appeal", {
      target_appeal_id: appeal.appeal_id,
      decision,
      resolution_text: reason.trim(),
    });
    if (rpcError) {
      setError(rpcError.message);
      setBusy(false);
      return;
    }
    setAppeal((current) => ({ ...current, status: decision, resolution: reason.trim() }));
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Link href="/moderation/appeals" className="text-sm font-semibold text-slate-600 hover:text-slate-950">← Back to appeals</Link>
      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="font-mono text-xs font-semibold text-slate-500">{appeal.case_number}</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-950">Appeal review</h1>
        <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
          <span className="rounded-full bg-slate-100 px-3 py-1">{appeal.status.replaceAll("_", " ")}</span>
          <span className="rounded-full bg-slate-100 px-3 py-1">{appeal.action_type.replaceAll("_", " ")}</span>
          <span className="rounded-full bg-slate-100 px-3 py-1">{appeal.target_type}</span>
        </div>
      </header>

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">Original moderation action</h2>
        <p className="mt-3 text-sm text-slate-700">{appeal.action_reason}</p>
        <p className="mt-2 break-all font-mono text-xs text-slate-500">Target: {appeal.target_id}</p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">Appellant&apos;s reason</h2>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{appeal.appeal_reason}</p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">Decision</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">Outcome
            <select value={decision} onChange={(e) => setDecision(e.target.value as typeof decision)} disabled={!canReview || busy} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2">
              <option value="UPHELD">Uphold action</option>
              <option value="REVERSED">Reverse action</option>
              <option value="PARTIALLY_REVERSED">Partially reverse</option>
              <option value="CLOSED">Close appeal</option>
            </select>
          </label>
          <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">Appeal decisions are server-authorized and audited. The reviewer cannot change the original action directly from the browser.</div>
        </div>
        <label className="mt-4 block text-sm font-medium text-slate-700">Decision reason
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={3000} rows={5} disabled={!canReview || busy} placeholder="Explain the decision and any relevant evidence considered." className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
        </label>
        <button type="button" onClick={review} disabled={!canReview || busy || reason.trim().length < 10} className="mt-4 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{busy ? "Saving…" : "Record decision"}</button>
      </section>
    </div>
  );
}
