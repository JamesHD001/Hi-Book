"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type ModerationCase = {
  case_id: string;
  case_number: string;
  target_type: "USER" | "POST" | "COMMENT" | "MESSAGE";
  target_id: string;
  source_type: string;
  priority: "LOW" | "NORMAL" | "HIGH" | "CRITICAL";
  status: "OPEN" | "IN_REVIEW" | "WAITING" | "ESCALATED" | "RESOLVED" | "CLOSED";
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  closed_at: string | null;
};

const priorityStyles: Record<ModerationCase["priority"], string> = {
  CRITICAL: "border-red-200 bg-red-50 text-red-800",
  HIGH: "border-amber-200 bg-amber-50 text-amber-800",
  NORMAL: "border-(--border) bg-(--surface-secondary) text-(--text-secondary)",
  LOW: "border-(--border) bg-(--surface) text-(--muted)",
};

export default function ModerationQueue({ initialCases }: { initialCases: ModerationCase[] }) {
  const supabase = createClient();
  const router = useRouter();
  const [cases, setCases] = useState(initialCases);
  const [busyCase, setBusyCase] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function assignToMe(caseId: string) {
    setBusyCase(caseId);
    setError(null);
    const { data, error: rpcError } = await supabase.rpc("assign_moderation_case", { target_case_id: caseId, assignee_id: null });
    if (rpcError) { setError(rpcError.message); setBusyCase(null); return; }
    setCases((current) => current.map((item) => (item.case_id === caseId ? { ...item, ...data } : item)));
    setBusyCase(null);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {error ? <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      {cases.length === 0 ? (
        <div className="rounded-lg border border-(--border) bg-(--surface) p-8 text-center text-sm text-(--muted)">No moderation cases match the current queue.</div>
      ) : (
        <div className="space-y-3">
          {cases.map((item) => (
            <article key={item.case_id} className="rounded-lg border border-(--border) bg-(--surface) p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-(--muted)">{item.case_number}</span>
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${priorityStyles[item.priority]}`}>{item.priority}</span>
                    <span className="rounded-sm bg-(--surface-secondary) px-2.5 py-1 text-xs font-medium text-(--text-secondary)">{item.status.replaceAll("_", " ")}</span>
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-(--foreground)">{item.target_type} moderation case</h2>
                    <p className="mt-1 break-all font-mono text-xs text-(--muted)">Target: {item.target_id}</p>
                  </div>
                  <p className="text-sm text-(--text-secondary)">Source: {item.source_type.replaceAll("_", " ")} · Created {new Date(item.created_at).toLocaleString()}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Link href={`/moderation/${item.case_id}`} className="rounded-md border border-(--border) px-3 py-2 text-sm font-semibold text-(--foreground) hover:bg-(--surface-secondary)">Review</Link>
                  {item.assigned_to ? (
                    <span className="inline-flex rounded-md bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">Assigned</span>
                  ) : (
                    <button type="button" onClick={() => assignToMe(item.case_id)} disabled={busyCase === item.case_id} className="rounded-md bg-(--brand-primary) px-3 py-2 text-sm font-semibold text-white transition hover:bg-(--brand-primary-dark) disabled:cursor-not-allowed disabled:opacity-60">{busyCase === item.case_id ? "Assigning…" : "Assign to me"}</button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
