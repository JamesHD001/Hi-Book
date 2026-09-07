"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type CaseDetail = {
  case_id: string;
  case_number: string;
  target_type: "USER" | "POST" | "COMMENT" | "MESSAGE";
  target_id: string;
  source_type: string;
  priority: string;
  status: string;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  closed_at: string | null;
  evidence: Array<{ id: string; evidence_type: string; metadata: { reason?: string; description?: string } | null; created_at: string }>;
  notes: Array<{ id: string; author_id: string; content: string; created_at: string }>;
  actions: Array<{ id: string; action_type: string; reason: string; severity: string; performed_by: string | null; starts_at: string; expires_at: string | null; revoked_at: string | null; created_at: string }>;
};

const actionOptions = [
  "WARNING", "CONTENT_HIDDEN", "CONTENT_REMOVED", "CONTENT_RESTRICTED",
  "USER_RESTRICTED", "USER_SUSPENDED", "USER_DEACTIVATED", "USER_BANNED",
  "MESSAGE_RESTRICTED", "NO_ACTION",
] as const;

export default function ModerationCaseView({ initialCase }: { initialCase: CaseDetail }) {
  const supabase = createClient();
  const router = useRouter();
  const [caseData, setCaseData] = useState(initialCase);
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const [action, setAction] = useState<(typeof actionOptions)[number]>("NO_ACTION");
  const [duration, setDuration] = useState("");
  const [severity, setSeverity] = useState("MEDIUM");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addNote() {
    if (!note.trim()) return;
    setBusy(true); setError(null);
    const { data, error: rpcError } = await supabase.rpc("add_moderation_note", { target_case_id: caseData.case_id, note_content: note });
    if (rpcError) setError(rpcError.message);
    else { setCaseData((current) => ({ ...current, notes: [...current.notes, data] })); setNote(""); }
    setBusy(false);
  }

  async function executeAction() {
    if (!reason.trim()) { setError("A moderation reason is required."); return; }
    if (action === "NO_ACTION") { setError("Choose a moderation action."); return; }
    setBusy(true); setError(null);
    const { data, error: rpcError } = await supabase.rpc("execute_moderation_action", {
      target_case_id: caseData.case_id,
      action,
      action_reason: reason,
      action_severity: severity,
      duration_minutes: duration ? Number(duration) : null,
    });
    if (rpcError) setError(rpcError.message);
    else {
      setCaseData((current) => ({ ...current, status: "RESOLVED", resolved_at: new Date().toISOString(), actions: [data, ...current.actions] }));
      setReason(""); setDuration("");
      router.refresh();
    }
    setBusy(false);
  }

  return (
    <div className="space-y-6">
      <Link href="/moderation" className="text-sm font-semibold text-slate-600 hover:text-slate-950">← Back to queue</Link>
      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-mono text-xs font-semibold text-slate-500">{caseData.case_number}</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-950">{caseData.target_type} case</h1>
            <p className="mt-1 break-all font-mono text-xs text-slate-500">{caseData.target_id}</p>
          </div>
          <div className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">{caseData.status.replaceAll("_", " ")}</div>
        </div>
      </header>

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">Evidence</h2>
        <div className="mt-4 space-y-3">
          {caseData.evidence.length === 0 ? <p className="text-sm text-slate-500">No evidence recorded.</p> : caseData.evidence.map((item) => (
            <div key={item.id} className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.evidence_type.replaceAll("_", " ")}</p>
              {item.metadata?.reason ? <p className="mt-2 text-sm font-semibold text-slate-900">Reason: {item.metadata.reason.replaceAll("_", " ")}</p> : null}
              {item.metadata?.description ? <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{item.metadata.description}</p> : null}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">Moderator action</h2>
        <p className="mt-1 text-sm text-slate-500">Actions are server-authorized and permanently audited.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">Action<select value={action} onChange={(e) => setAction(e.target.value as typeof action)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2">{actionOptions.map((value) => <option key={value}>{value.replaceAll("_", " ")}</option>)}</select></label>
          <label className="text-sm font-medium text-slate-700">Severity<select value={severity} onChange={(e) => setSeverity(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"><option>LOW</option><option>MEDIUM</option><option>HIGH</option><option>CRITICAL</option></select></label>
          <label className="text-sm font-medium text-slate-700 sm:col-span-2">Reason<textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={2000} rows={3} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
          <label className="text-sm font-medium text-slate-700">Duration (minutes, optional)<input type="number" min={1} max={525600} value={duration} onChange={(e) => setDuration(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
        </div>
        <button type="button" onClick={executeAction} disabled={busy || caseData.status === "RESOLVED" || caseData.status === "CLOSED"} className="mt-4 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{busy ? "Processing…" : "Execute moderation action"}</button>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">Internal notes</h2>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row"><textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={5000} rows={3} placeholder="Add an internal moderation note…" className="min-h-24 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" /><button type="button" onClick={addNote} disabled={busy || !note.trim()} className="rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Add note</button></div>
        <div className="mt-5 space-y-3">{caseData.notes.map((item) => <article key={item.id} className="rounded-xl bg-slate-50 p-4"><p className="whitespace-pre-wrap text-sm text-slate-800">{item.content}</p><p className="mt-2 text-xs text-slate-500">{new Date(item.created_at).toLocaleString()}</p></article>)}</div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">Action history</h2>
        <div className="mt-4 space-y-3">{caseData.actions.length === 0 ? <p className="text-sm text-slate-500">No actions yet.</p> : caseData.actions.map((item) => <article key={item.id} className="rounded-xl border border-slate-200 p-4"><p className="text-sm font-semibold text-slate-900">{item.action_type.replaceAll("_", " ")}</p><p className="mt-1 text-sm text-slate-600">{item.reason}</p><p className="mt-2 text-xs text-slate-500">{item.severity} · {new Date(item.created_at).toLocaleString()}{item.expires_at ? ` · expires ${new Date(item.expires_at).toLocaleString()}` : ""}</p></article>)}</div>
      </section>
    </div>
  );
}
