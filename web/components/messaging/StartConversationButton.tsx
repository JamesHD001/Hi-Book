"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function StartConversationButton({ targetUserId }: { targetUserId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startConversation() {
    if (pending) return;
    setPending(true);
    setError(null);

    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc(
      "get_or_create_direct_conversation",
      { target_user_id: targetUserId },
    );

    if (rpcError) {
      setError(
        rpcError.message.toLowerCase().includes("not permitted")
          ? "This person is not accepting messages from you."
          : rpcError.message,
      );
      setPending(false);
      return;
    }

    if (!data) {
      setError("Could not open the conversation.");
      setPending(false);
      return;
    }

    router.push(`/messages/${data}`);
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => void startConversation()}
        disabled={pending}
        className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Opening…" : "Message"}
      </button>
      {error && <p className="mt-2 max-w-xs text-xs text-red-600">{error}</p>}
    </div>
  );
}
