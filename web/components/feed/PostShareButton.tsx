"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  postId: string;
};

export default function PostShareButton({ postId }: Props) {
  const supabase = createClient();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function recordShare() {
    const { error } = await supabase.rpc("share_post", { target_post_id: postId });
    if (error) throw error;
  }

  async function copyLink() {
    setBusy(true);
    setMessage(null);
    try {
      const url = `${window.location.origin}/community?post=${encodeURIComponent(postId)}`;
      await navigator.clipboard.writeText(url);
      await recordShare();
      setMessage("Link copied");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Could not share this post.");
    } finally {
      setBusy(false);
    }
  }

  async function nativeShare() {
    if (!navigator.share) {
      await copyLink();
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      const url = `${window.location.origin}/community?post=${encodeURIComponent(postId)}`;
      await navigator.share({ title: "Hi!Book post", url });
      await recordShare();
      setMessage("Shared");
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") return;
      setMessage(caught instanceof Error ? caught.message : "Could not share this post.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => void nativeShare()}
        disabled={busy}
        className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
      >
        ↗ Share
      </button>
      <button
        type="button"
        onClick={() => void copyLink()}
        disabled={busy}
        className="rounded-xl px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 disabled:opacity-50"
      >
        Copy link
      </button>
      {message && <span className="text-xs text-slate-500" role="status">{message}</span>}
    </div>
  );
}
