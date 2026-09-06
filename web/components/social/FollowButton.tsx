"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function FollowButton({
  targetUserId,
  initialFollowing,
}: {
  targetUserId: string;
  initialFollowing: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [following, setFollowing] = useState(initialFollowing);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggleFollow() {
    if (pending) return;
    setPending(true);
    setError(null);

    const previous = following;
    setFollowing(!previous);

    const result = previous
      ? await supabase
          .from("follows")
          .delete()
          .eq("follower_id", (await supabase.auth.getUser()).data.user?.id ?? "")
          .eq("following_id", targetUserId)
      : await supabase.from("follows").insert({
          follower_id: (await supabase.auth.getUser()).data.user?.id,
          following_id: targetUserId,
        });

    if (result.error) {
      setFollowing(previous);
      setError(result.error.message);
    } else {
      router.refresh();
    }

    setPending(false);
  }

  return (
    <div>
      <button
        type="button"
        onClick={toggleFollow}
        disabled={pending}
        className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
          following
            ? "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
            : "bg-slate-950 text-white hover:bg-slate-800"
        }`}
      >
        {pending ? "Working…" : following ? "Following" : "Follow"}
      </button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
