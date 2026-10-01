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
      <Link href="/moderation/appeals" className="text-sm font-semibold text-(--text-secondary) hover:text-(--foreground)">← Back to appeals</Link>
      <header className="rounded-lg border border-(--border) bg-(--surface) p-6 shadow-sm">
        <p className="font-mono text-xs font-semibold text-(--muted)">{appeal.case_number}</p>
        <h1 className="mt-2 text-2xl font-bold text-(--foreground)">Appeal review</h1>
        <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
          <span className="rounded-sm bg-(--brand-accent-soft) px-3 py-1 text-(--foreground)">{appeal.status.replaceAll("_", " ")}</span>
          <span className="rounded-sm bg-(--surface-secondary) px-3 py-1 text-(--text-secondary)">{appeal.action_type.replaceAll("_", " ")}</span>
          <span className="rounded-sm bg-(--surface-secondary) px-3 py-1 text-(--text-secondary)">{appeal.target_type}</span>
        </div>
      </header>

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <section className="rounded-lg border border-(--border) bg-(--surface) p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-(--foreground)">Original moderation action</h2>
        <p className="mt-3 text-sm text-(--text-secondary)">{appeal.action_reason}</p>
        <p className="mt-2 break-all font-mono text-xs text-(--muted)">Target: {appeal.target_id}</p>
      </section>

      <section className="rounded-lg border border-(--border) bg-(--surface) p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-(--foreground)">Appellant&apos;s reason</h2>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-(--text-secondary)">{appeal.appeal_reason}</p>
      </section>

      <section className="rounded-lg border border-(--border) bg-(--surface) p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-(--foreground)">Decision</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-(--foreground)">Outcome
            <select value={decision} onChange={(e) => setDecision(e.target.value as typeof decision)} disabled={!canReview || busy} className="mt-1 w-full rounded-md border border-(--border) bg-(--surface) px-3 py-2 focus:border-(--brand-primary)">
              <option value="UPHELD">Uphold action</option>
              <option value="REVERSED">Reverse action</option>
              <option value="PARTIALLY_REVERSED">Partially reverse</option>
              <option value="CLOSED">Close appeal</option>
            </select>
          </label>
          <div className="rounded-md bg-(--surface-secondary) p-3 text-xs text-(--text-secondary)">Appeal decisions are server-authorized and audited. The reviewer cannot change the original action directly from the browser.</div>
        </div>
        <label className="mt-4 block text-sm font-medium text-(--foreground)">Decision reason
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={3000} rows={5} disabled={!canReview || busy} placeholder="Explain the decision and any relevant evidence considered." className="mt-1 w-full rounded-md border border-(--border) bg-(--surface) px-3 py-2 focus:border-(--brand-primary)" />
        </label>
        <button type="button" onClick={review} disabled={!canReview || busy || reason.trim().length < 10} className="mt-4 rounded-md bg-(--brand-primary) px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-(--brand-primary-dark) disabled:cursor-not-allowed disabled:opacity-50">{busy ? "Saving…" : "Record decision"}</button>
      </section>
    </div>
  );
}
