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

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      setError("Your session has expired. Please sign in again.");
      setPending(false);
      return;
    }

    const previous = following;
    setFollowing(!previous);

    const result = previous
      ? await supabase
          .from("follows")
          .delete()
          .eq("follower_id", authData.user.id)
          .eq("following_id", targetUserId)
      : await supabase.from("follows").insert({
          follower_id: authData.user.id,
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
        className={`hb-button min-h-10 px-5 text-sm disabled:cursor-not-allowed disabled:opacity-60 ${
          following
            ? "hb-button--secondary"
            : "hb-button--primary"
        }`}
      >
        {pending ? "Working…" : following ? "Following" : "Follow"}
      </button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
