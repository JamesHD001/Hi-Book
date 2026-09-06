"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Comment = {
  comment_id: string;
  user_id: string;
  username: string;
  display_name: string;
  avatar_path: string | null;
  avatar_url?: string | null;
  parent_comment_id: string | null;
  content: string;
  created_at: string;
};

type LikeState = { liked: boolean; like_count: number };

function timeAgo(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  if (diff < 60000) return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d`;
  return new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export default function PostComments({ postId }: { postId: string }) {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [likes, setLikes] = useState<Record<string, LikeState>>({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [busyLike, setBusyLike] = useState<Record<string, boolean>>({});
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function loadComments() {
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc("get_post_comments", {
        target_post_id: postId,
        page_limit: 100,
      });
      if (rpcError) throw rpcError;
      const rows = (data ?? []) as Comment[];
      const hydrated = await Promise.all(rows.map(async (comment) => {
        if (!comment.avatar_path) return comment;
        const { data: signed } = await supabase.storage.from("avatars").createSignedUrl(comment.avatar_path, 600);
        return { ...comment, avatar_url: signed?.signedUrl ?? null };
      }));
      setComments(hydrated);
      const likeEntries = await Promise.all(hydrated.map(async (comment) => {
        const { data: likeData } = await supabase.rpc("get_comment_like_state", { target_comment_id: comment.comment_id });
        const state = likeData?.[0];
        return state ? [comment.comment_id, { liked: Boolean(state.liked), like_count: Number(state.like_count) }] as const : null;
      }));
      setLikes(Object.fromEntries(likeEntries.filter((entry): entry is readonly [string, LikeState] => entry !== null)));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load comments.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open) void loadComments();
  }, [open, postId]);

  async function submitComment() {
    const content = text.trim();
    if (!content || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc("create_comment", {
        target_post_id: postId,
        comment_content: content,
        parent_comment_id_input: replyTo?.comment_id ?? null,
      });
      if (rpcError) throw rpcError;
      if (!data?.[0]) throw new Error("Comment could not be created.");
      setText("");
      setReplyTo(null);
      await loadComments();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not add comment.");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleLike(commentId: string) {
    if (busyLike[commentId]) return;
    setBusyLike((current) => ({ ...current, [commentId]: true }));
    try {
      const { data, error: rpcError } = await supabase.rpc("toggle_comment_like", { target_comment_id: commentId });
      if (rpcError) throw rpcError;
      const state = data?.[0];
      if (!state) throw new Error("Could not update comment like.");
      setLikes((current) => ({ ...current, [commentId]: { liked: Boolean(state.liked), like_count: Number(state.like_count) } }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update comment like.");
    } finally {
      setBusyLike((current) => ({ ...current, [commentId]: false }));
    }
  }

  const roots = comments.filter((comment) => comment.parent_comment_id === null);
  const repliesFor = (commentId: string) => comments.filter((comment) => comment.parent_comment_id === commentId);

  return (
    <div className="border-t border-slate-100 px-5">
      <button type="button" onClick={() => setOpen((value) => !value)} className="py-3 text-sm font-semibold text-slate-600 hover:text-slate-950" aria-expanded={open}>
        {open ? "Hide comments" : "Comment"}
      </button>
      {open && (
        <div className="space-y-4 pb-5">
          {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}
          <div className="rounded-xl bg-slate-50 p-3">
            {replyTo && <div className="mb-2 flex items-center justify-between text-xs text-slate-500"><span>Replying to @{replyTo.username}</span><button type="button" onClick={() => setReplyTo(null)} className="font-semibold hover:text-slate-900">Cancel</button></div>}
            <textarea value={text} onChange={(event) => setText(event.target.value.slice(0, 2000))} placeholder={replyTo ? "Write a reply…" : "Write a comment…"} rows={3} className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400" />
            <div className="mt-2 flex items-center justify-between"><span className="text-xs text-slate-400">{text.length}/2000</span><button type="button" onClick={() => void submitComment()} disabled={!text.trim() || submitting} className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{submitting ? "Posting…" : replyTo ? "Reply" : "Comment"}</button></div>
          </div>
          {loading && <p className="text-sm text-slate-500">Loading comments…</p>}
          {!loading && roots.length === 0 && <p className="text-sm text-slate-500">No comments yet. Start the conversation.</p>}
          {!loading && roots.map((comment) => {
            const like = likes[comment.comment_id] ?? { liked: false, like_count: 0 };
            return <div key={comment.comment_id} className="space-y-2">
              <div className="flex gap-3">
                <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-slate-100">{comment.avatar_url ? <img src={comment.avatar_url} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-xs font-bold text-slate-500">{comment.display_name.charAt(0).toUpperCase()}</div>}</div>
                <div className="min-w-0 flex-1 rounded-xl bg-slate-50 px-3 py-2"><div className="flex items-baseline gap-2"><Link href={`/u/${comment.username}`} className="text-sm font-semibold text-slate-900 hover:underline">{comment.display_name}</Link><span className="text-xs text-slate-400">{timeAgo(comment.created_at)}</span></div><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">{comment.content}</p></div>
              </div>
              <div className="ml-11 flex gap-3 text-xs font-semibold text-slate-500"><button type="button" onClick={() => void toggleLike(comment.comment_id)} disabled={busyLike[comment.comment_id]} className={like.liked ? "text-red-700" : "hover:text-slate-900"}>{like.liked ? "♥ Liked" : "♡ Like"} {like.like_count > 0 ? like.like_count : ""}</button><button type="button" onClick={() => setReplyTo(comment)} className="hover:text-slate-900">Reply</button></div>
              {repliesFor(comment.comment_id).map((reply) => { const replyLike = likes[reply.comment_id] ?? { liked: false, like_count: 0 }; return <div key={reply.comment_id} className="ml-11 space-y-2"><div className="flex gap-3"><div className="h-7 w-7 shrink-0 overflow-hidden rounded-full bg-slate-100">{reply.avatar_url ? <img src={reply.avatar_url} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-[10px] font-bold text-slate-500">{reply.display_name.charAt(0).toUpperCase()}</div>}</div><div className="min-w-0 flex-1 rounded-xl bg-slate-50 px-3 py-2"><div className="flex items-baseline gap-2"><Link href={`/u/${reply.username}`} className="text-sm font-semibold text-slate-900 hover:underline">{reply.display_name}</Link><span className="text-xs text-slate-400">{timeAgo(reply.created_at)}</span></div><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">{reply.content}</p></div></div><div className="ml-10 flex gap-3 text-xs font-semibold text-slate-500"><button type="button" onClick={() => void toggleLike(reply.comment_id)} disabled={busyLike[reply.comment_id]} className={replyLike.liked ? "text-red-700" : "hover:text-slate-900"}>{replyLike.liked ? "♥ Liked" : "♡ Like"} {replyLike.like_count > 0 ? replyLike.like_count : ""}</button></div></div>; })}
            </div>;
          })}
        </div>
      )}
    </div>
  );
}
