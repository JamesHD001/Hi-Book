"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const reasons = [
  ["SPAM", "Spam"],
  ["HARASSMENT", "Harassment"],
  ["HATE_OR_DISCRIMINATION", "Hate or discrimination"],
  ["THREATS_OR_VIOLENCE", "Threats or violence"],
  ["SEXUAL_CONTENT", "Sexual content"],
  ["CHILD_SAFETY", "Child safety"],
  ["SELF_HARM", "Self-harm"],
  ["ILLEGAL_CONTENT", "Illegal content"],
  ["IMPERSONATION", "Impersonation"],
  ["SCAM_OR_FRAUD", "Scam or fraud"],
  ["PRIVACY_VIOLATION", "Privacy violation"],
  ["COPYRIGHT", "Copyright"],
  ["MISINFORMATION", "Misinformation"],
  ["OTHER", "Other"],
] as const;

export default function ReportDialog({
  targetType = "USER",
  targetId,
}: {
  targetType?: "USER" | "POST" | "COMMENT";
  targetId: string;
}) {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<(typeof reasons)[number][0]>("OTHER");
  const [description, setDescription] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setMessage(null);

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      setMessage("Your session has expired. Please sign in again.");
      setPending(false);
      return;
    }

    const { error } = await supabase.from("reports").insert({
      reporter_id: authData.user.id,
      target_type: targetType,
      target_id: targetId,
      reason,
      description: description.trim() || null,
    });

    if (error) {
      setMessage(
        error.code === "23505"
          ? "You already submitted this report."
          : error.message,
      );
    } else {
      setMessage("Report submitted. Thank you for helping keep Hi!Book safe.");
      setDescription("");
      setOpen(false);
    }

    setPending(false);
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
      >
        Report
      </button>

      {message && <p className="mt-2 text-xs text-slate-600">{message}</p>}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-950">Report</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Reports are reviewed as safety signals; a report does not automatically ban someone.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-sm text-slate-500 hover:text-slate-950"
              >
                Close
              </button>
            </div>

            <form onSubmit={submit} className="mt-6 space-y-4">
              <label className="block text-sm font-medium text-slate-700">
                Reason
                <select
                  value={reason}
                  onChange={(event) => setReason(event.target.value as typeof reason)}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-slate-500"
                >
                  {reasons.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Additional details (optional)
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value.slice(0, 2000))}
                  rows={5}
                  maxLength={2000}
                  className="mt-2 w-full resize-y rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-slate-500"
                  placeholder="Tell the safety team what happened."
                />
              </label>

              <button
                type="submit"
                disabled={pending}
                className="w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {pending ? "Submitting…" : "Submit report"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
