"use client";

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
  CRITICAL: "border-red-200 bg-red-50 text-red-700",
  HIGH: "border-orange-200 bg-orange-50 text-orange-700",
  NORMAL: "border-slate-200 bg-slate-50 text-slate-700",
  LOW: "border-slate-200 bg-white text-slate-500",
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

    const { data, error: rpcError } = await supabase.rpc("assign_moderation_case", {
      target_case_id: caseId,
      assignee_id: null,
    });

    if (rpcError) {
      setError(rpcError.message);
      setBusyCase(null);
      return;
    }

    setCases((current) =>
      current.map((item) => (item.case_id === caseId ? { ...item, ...data } : item)),
    );
    setBusyCase(null);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {cases.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
          No moderation cases match the current queue.
        </div>
      ) : (
        <div className="space-y-3">
          {cases.map((item) => (
            <article
              key={item.case_id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-slate-500">
                      {item.case_number}
                    </span>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${priorityStyles[item.priority]}`}
                    >
                      {item.priority}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                      {item.status.replaceAll("_", " ")}
                    </span>
                  </div>

                  <div>
                    <h2 className="text-base font-semibold text-slate-950">
                      {item.target_type} moderation case
                    </h2>
                    <p className="mt-1 break-all font-mono text-xs text-slate-500">
                      Target: {item.target_id}
                    </p>
                  </div>

                  <p className="text-sm text-slate-500">
                    Source: {item.source_type.replaceAll("_", " ")} · Created {new Date(item.created_at).toLocaleString()}
                  </p>
                </div>

                <div className="shrink-0">
                  {item.assigned_to ? (
                    <span className="inline-flex rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                      Assigned
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => assignToMe(item.case_id)}
                      disabled={busyCase === item.case_id}
                      className="rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {busyCase === item.case_id ? "Assigning…" : "Assign to me"}
                    </button>
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
