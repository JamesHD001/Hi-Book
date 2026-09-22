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
  CRITICAL: "border-[#e6c9bf] bg-[#fbebe6] text-[#8f3d2d]",
  HIGH: "border-[#e8d0b8] bg-[#f8eee4] text-[#8b4f25]",
  NORMAL: "border-[#d8d2c6] bg-[#f6f2ea] text-[#68645d]",
  LOW: "border-[#d8d2c6] bg-white text-[#777168]",
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
      {error ? <div className="rounded-xl border border-[#e6c9bf] bg-[#fbebe6] px-4 py-3 text-sm text-[#8f3d2d]">{error}</div> : null}
      {cases.length === 0 ? (
        <div className="rounded-2xl border border-[#d8d2c6] bg-white p-8 text-center text-sm text-[#777168] ">No moderation cases match the current queue.</div>
      ) : (
        <div className="space-y-3">
          {cases.map((item) => (
            <article key={item.case_id} className="rounded-2xl border border-[#d8d2c6] bg-white p-5 ">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-[#777168]">{item.case_number}</span>
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${priorityStyles[item.priority]}`}>{item.priority}</span>
                    <span className="rounded-full bg-[#eee9e1] px-2.5 py-1 text-xs font-medium text-[#68645d]">{item.status.replaceAll("_", " ")}</span>
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-[#171717]">{item.target_type} moderation case</h2>
                    <p className="mt-1 break-all font-mono text-xs text-[#777168]">Target: {item.target_id}</p>
                  </div>
                  <p className="text-sm text-[#777168]">Source: {item.source_type.replaceAll("_", " ")} · Created {new Date(item.created_at).toLocaleString()}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Link href={`/moderation/${item.case_id}`} className="rounded-lg border border-[#cfc8bc] px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-[#f6f2ea]">Review</Link>
                  {item.assigned_to ? (
                    <span className="inline-flex rounded-lg bg-[#eef5f0] px-3 py-2 text-xs font-semibold text-[#42634d]">Assigned</span>
                  ) : (
                    <button type="button" onClick={() => assignToMe(item.case_id)} disabled={busyCase === item.case_id} className="rounded-lg bg-[#171717] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#2a2a2a] disabled:cursor-not-allowed disabled:opacity-60">{busyCase === item.case_id ? "Assigning…" : "Assign to me"}</button>
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
