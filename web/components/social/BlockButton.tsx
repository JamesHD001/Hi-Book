"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function BlockButton({
  targetUserId,
  initialBlocked,
}: {
  targetUserId: string;
  initialBlocked?: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [blocked, setBlocked] = useState(initialBlocked ?? false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggleBlock() {
    if (pending) return;
    setPending(true);
    setError(null);

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      setError("Your session has expired. Please sign in again.");
      setPending(false);
      return;
    }

    if (blocked) {
      const { error: deleteError } = await supabase
        .from("blocks")
        .delete()
        .eq("blocker_id", authData.user.id)
        .eq("blocked_id", targetUserId);

      if (deleteError) setError(deleteError.message);
      else setBlocked(false);
    } else {
      const { error: followDeleteError } = await supabase
        .from("follows")
        .delete()
        .or(
          `and(follower_id.eq.${authData.user.id},following_id.eq.${targetUserId}),and(follower_id.eq.${targetUserId},following_id.eq.${authData.user.id})`,
        );

      if (followDeleteError) {
        setError(followDeleteError.message);
        setPending(false);
        return;
      }

      const { error: blockError } = await supabase.from("blocks").insert({
        blocker_id: authData.user.id,
        blocked_id: targetUserId,
      });

      if (blockError) setError(blockError.message);
      else {
        setBlocked(true);
        router.push("/community");
        router.refresh();
      }
    }

    setPending(false);
  }

  return (
    <button
      type="button"
      onClick={toggleBlock}
      disabled={pending}
      className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
    >
      {pending ? "Working…" : blocked ? "Unblock" : "Block"}
    </button>
  );
}
