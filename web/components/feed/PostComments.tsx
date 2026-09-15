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

function initials(displayName: string) {
  return displayName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "?";
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
      const avatarPaths = Array.from(
        new Set(
          rows
            .map((comment) => comment.avatar_path)
            .filter((path): path is string => Boolean(path)),
        ),
      );
      const { data: avatarData } = avatarPaths.length
        ? await supabase.storage.from("avatars").createSignedUrls(avatarPaths, 600)
        : { data: [] };
      const avatarMap = new Map((avatarData ?? []).map((item) => [item.path, item.signedUrl]));
      const hydrated = rows.map((comment) => ({
        ...comment,
        avatar_url: comment.avatar_path ? avatarMap.get(comment.avatar_path) ?? null : null,
      }));
      setComments(hydrated);

      const { data: likeData, error: likeError } = hydrated.length
        ? await supabase.rpc("get_comment_like_states", {
            target_comment_ids: hydrated.map((comment) => comment.comment_id),
          })
        : { data: [], error: null };
      if (likeError) throw likeError;
      const nextLikes = Object.fromEntries(
        ((likeData ?? []) as { comment_id: string; liked: boolean; like_count: number }[]).map((state) => [
          state.comment_id,
          { liked: Boolean(state.liked), like_count: Number(state.like_count) },
        ]),
      );
      setLikes(nextLikes);
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
      const { data, error: rpcError } = await supabase.rpc("toggle_comment_like", {
        target_comment_id: commentId,
      });
      if (rpcError) throw rpcError;
      const state = data?.[0];
      if (!state) throw new Error("Could not update comment like.");
      setLikes((current) => ({
        ...current,
        [commentId]: { liked: Boolean(state.liked), like_count: Number(state.like_count) },
      }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update comment like.");
    } finally {
      setBusyLike((current) => ({ ...current, [commentId]: false }));
    }
  }

  const roots = comments.filter((comment) => comment.parent_comment_id === null);
  const repliesFor = (commentId: string) => comments.filter((comment) => comment.parent_comment_id === commentId);

  function CommentAvatar({ comment, small = false }: { comment: Comment; small?: boolean }) {
    const size = small ? "h-8 w-8" : "h-10 w-10";
    return (
      <div className={`${size} shrink-0 overflow-hidden rounded-2xl bg-slate-100`}>
        {comment.avatar_url ? (
          <img src={comment.avatar_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-950 text-xs font-bold text-white">
            {initials(comment.display_name)}
          </div>
        )}
      </div>
    );
  }

  function LikeButton({ comment }: { comment: Comment }) {
    const like = likes[comment.comment_id] ?? { liked: false, like_count: 0 };
    return (
      <button
        type="button"
        onClick={() => void toggleLike(comment.comment_id)}
        disabled={busyLike[comment.comment_id]}
        className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
          like.liked
            ? "bg-slate-100 text-slate-950"
            : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
        }`}
        aria-label={like.liked ? `Unlike comment${like.like_count ? `, ${like.like_count} likes` : ""}` : `Like comment${like.like_count ? `, ${like.like_count} likes` : ""}`}
      >
        {like.liked ? "♥ Liked" : "♡ Like"}
        {like.like_count > 0 ? ` · ${like.like_count}` : ""}
      </button>
    );
  }

  return (
    <div className="border-t border-slate-100 px-4 sm:px-5">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 py-4 text-left text-sm font-semibold text-slate-600 transition hover:text-slate-950"
        aria-expanded={open}
        aria-controls={`comments-${postId}`}
      >
        <span className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-xs">◎</span>
          {open ? "Hide comments" : "Join the conversation"}
        </span>
        <span className={`text-xs transition-transform ${open ? "rotate-180" : ""}`}>⌄</span>
      </button>

      {open && (
        <div id={`comments-${postId}`} className="space-y-5 pb-6">
          {error && (
            <p className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700" role="alert">
              {error}
            </p>
          )}

          <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50/80 p-3 shadow-sm">
            {replyTo && (
              <div className="mb-3 flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 text-xs text-slate-500">
                <span className="min-w-0 truncate">
                  Replying to <strong className="text-slate-800">@{replyTo.username}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setReplyTo(null)}
                  className="shrink-0 rounded-full px-2 py-1 font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                >
                  Cancel
                </button>
              </div>
            )}
            <label htmlFor={`comment-${postId}`} className="sr-only">
              {replyTo ? "Write a reply" : "Write a comment"}
            </label>
            <textarea
              id={`comment-${postId}`}
              value={text}
              onChange={(event) => setText(event.target.value.slice(0, 2000))}
              placeholder={replyTo ? "Write a thoughtful reply…" : "Share your thoughts…"}
              rows={3}
              className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm leading-6 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            />
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className={`text-xs font-medium ${text.length >= 1900 ? "text-slate-700" : "text-slate-400"}`}>
                {text.length}/2000
              </span>
              <button
                type="button"
                onClick={() => void submitComment()}
                disabled={!text.trim() || submitting}
                className="rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {submitting ? "Posting…" : replyTo ? "Post reply" : "Post comment"}
              </button>
            </div>
          </div>

          {loading && (
            <div className="space-y-3" aria-label="Loading comments">
              {[0, 1, 2].map((item) => (
                <div key={item} className="flex gap-3 animate-pulse">
                  <div className="h-10 w-10 shrink-0 rounded-2xl bg-slate-200" />
                  <div className="flex-1 space-y-2 rounded-2xl bg-slate-50 p-3">
                    <div className="h-3 w-28 rounded bg-slate-200" />
                    <div className="h-3 w-4/5 rounded bg-slate-200" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && roots.length === 0 && (
            <div className="rounded-[1.25rem] border border-dashed border-slate-200 px-5 py-8 text-center">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-sm font-black text-white">H!</div>
              <p className="mt-3 text-sm font-bold text-slate-900">Start the conversation.</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">Be the first person to share a thought on this post.</p>
            </div>
          )}

          {!loading && roots.length > 0 && (
            <div className="space-y-5">
              {roots.map((comment) => {
                const replies = repliesFor(comment.comment_id);
                return (
                  <article key={comment.comment_id} className="space-y-2">
                    <div className="flex gap-3">
                      <Link
                        href={`/u/${comment.username}`}
                        className="shrink-0 rounded-2xl focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
                        aria-label={`View ${comment.display_name}'s profile`}
                      >
                        <CommentAvatar comment={comment} />
                      </Link>
                      <div className="min-w-0 flex-1">
                        <div className="rounded-[1.15rem] rounded-tl-md bg-slate-50 px-3.5 py-3">
                          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                            <Link href={`/u/${comment.username}`} className="text-sm font-bold text-slate-900 hover:underline">
                              {comment.display_name}
                            </Link>
                            <span className="text-xs font-medium text-slate-400">@{comment.username}</span>
                            <span className="text-xs text-slate-400">· {timeAgo(comment.created_at)}</span>
                          </div>
                          <p className="mt-1.5 whitespace-pre-wrap text-sm leading-6 text-slate-700">{comment.content}</p>
                        </div>
                        <div className="mt-1 flex items-center gap-1">
                          <LikeButton comment={comment} />
                          <button
                            type="button"
                            onClick={() => setReplyTo(comment)}
                            className="rounded-full px-2.5 py-1 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                          >
                            Reply
                          </button>
                        </div>
                      </div>
                    </div>

                    {replies.length > 0 && (
                      <div className="ml-8 border-l border-slate-200 pl-4 sm:ml-12">
                        <div className="space-y-4">
                          {replies.map((reply) => (
                            <div key={reply.comment_id} className="flex gap-2.5">
                              <Link
                                href={`/u/${reply.username}`}
                                className="shrink-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
                                aria-label={`View ${reply.display_name}'s profile`}
                              >
                                <CommentAvatar comment={reply} small />
                              </Link>
                              <div className="min-w-0 flex-1">
                                <div className="rounded-[1.05rem] rounded-tl-md bg-slate-50 px-3 py-2.5">
                                  <div className="flex flex-wrap items-baseline gap-x-2">
                                    <Link href={`/u/${reply.username}`} className="text-sm font-bold text-slate-900 hover:underline">
                                      {reply.display_name}
                                    </Link>
                                    <span className="text-xs text-slate-400">· {timeAgo(reply.created_at)}</span>
                                  </div>
                                  <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">{reply.content}</p>
                                </div>
                                <div className="mt-1 flex items-center gap-1">
                                  <LikeButton comment={reply} />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
