"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AppealForm({ actionId }: { actionId: string }) {
  const [reason, setReason] = useState("");
  const [state, setState] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit() {
    setState("submitting");
    setMessage("");
    const supabase = createClient();
    const { error } = await supabase.rpc("submit_moderation_appeal", {
      target_action_id: actionId,
      appeal_reason: reason,
    });

    if (error) {
      setState("error");
      setMessage(error.message);
      return;
    }

    setState("success");
    setMessage("Your appeal has been submitted for review.");
  }

  return (
    <div className="mt-4 rounded-xl border border-[#d8d2c6] bg-[#f6f2ea] p-4">
      <label className="text-sm font-medium text-[#171717]" htmlFor={`appeal-${actionId}`}>
        Appeal this action
      </label>
      <textarea
        id={`appeal-${actionId}`}
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        maxLength={5000}
        rows={4}
        disabled={state === "submitting" || state === "success"}
        placeholder="Explain why you believe this moderation action should be reconsidered."
        className="mt-2 w-full rounded-lg border border-[#cfc8bc] bg-[#fffdf8] p-3 text-sm outline-none focus:border-[#c85b45]"
      />
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-xs text-[#777168]">10–5,000 characters</span>
        <button
          type="button"
          onClick={submit}
          disabled={reason.trim().length < 10 || state === "submitting" || state === "success"}
          className="rounded-lg bg-[#171717] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {state === "submitting" ? "Submitting…" : state === "success" ? "Submitted" : "Submit appeal"}
        </button>
      </div>
      {message && (
        <p className={`mt-3 text-sm ${state === "error" ? "text-[#8f3d2d]" : "text-[#42634d]"}`}>
          {message}
        </p>
      )}
    </div>
  );
}
