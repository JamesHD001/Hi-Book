"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import PostComments from "@/components/feed/PostComments";
import PostShareButton from "@/components/feed/PostShareButton";

type FeedMedia = { id: string; url: string; width: number | null; height: number | null; alt_text: string | null };
type FeedPost = { post_id: string; username: string; display_name: string; avatar_url: string | null; content: string | null; visibility: "PUBLIC" | "FOLLOWERS" | "PRIVATE"; created_at: string; media: FeedMedia[] };
type Scope = "HOME" | "FOLLOWING" | "EXPLORE";
type Cursor = { created_at: string; post_id: string } | null;
type LikeState = { liked: boolean; like_count: number };

function timeAgo(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  if (diff < 60000) return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d`;
  return new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function scopeDescription(scope: Scope) {
  if (scope === "FOLLOWING") return "Posts from people you follow.";
  if (scope === "EXPLORE") return "A wider look at public posts.";
  return "A personal mix of the latest posts available to you.";
}

export default function PostFeed() {
  const supabase = createClient();
  const [scope, setScope] = useState<Scope>("HOME");
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [cursor, setCursor] = useState<Cursor>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [likes, setLikes] = useState<Record<string, LikeState>>({});
  const [likeBusy, setLikeBusy] = useState<Record<string, boolean>>({});

  async function hydrateLikes(items: FeedPost[]) {
    if (!items.length) return;
    const { data, error: rpcError } = await supabase.rpc("get_post_like_states", { target_post_ids: items.map((post) => post.post_id) });
    if (rpcError) throw rpcError;
    const nextLikes = Object.fromEntries(((data ?? []) as { post_id: string; liked: boolean; like_count: number }[]).map((state) => [state.post_id, { liked: Boolean(state.liked), like_count: Number(state.like_count) }]));
    setLikes((current) => ({ ...current, ...nextLikes }));
  }

  async function load(nextScope: Scope, nextCursor: Cursor = null, append = false) {
    if (append) setLoadingMore(true); else setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ scope: nextScope });
      if (nextCursor) {
        params.set("before_created_at", nextCursor.created_at);
        params.set("before_post_id", nextCursor.post_id);
      }
      const response = await fetch(`/api/feed?${params}`, { cache: "no-store" });
      const payload = (await response.json()) as { posts?: FeedPost[]; next_cursor?: Cursor; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Could not load the feed.");
      const nextPosts = payload.posts ?? [];
      setPosts((current) => (append ? [...current, ...nextPosts] : nextPosts));
      setCursor(payload.next_cursor ?? null);
      await hydrateLikes(nextPosts);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load the feed.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }

  async function refresh() {
    if (loading || loadingMore || refreshing) return;
    setRefreshing(true);
    await load(scope);
  }

  async function toggleLike(postId: string) {
    if (likeBusy[postId]) return;
    setLikeBusy((current) => ({ ...current, [postId]: true }));
    try {
      const { data, error: rpcError } = await supabase.rpc("toggle_post_like", { target_post_id: postId });
      if (rpcError) throw rpcError;
      const liked = Boolean(data);
      setLikes((current) => {
        const previous = current[postId] ?? { liked: false, like_count: 0 };
        return { ...current, [postId]: { liked, like_count: Math.max(0, previous.like_count + (liked ? 1 : -1)) } };
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update the like.");
    } finally {
      setLikeBusy((current) => ({ ...current, [postId]: false }));
    }
  }

  useEffect(() => {
    void load("HOME");
  }, []);

  useEffect(() => {
    const refreshAfterPost = () => void load(scope);
    window.addEventListener("hibook:post-created", refreshAfterPost);
    return () => window.removeEventListener("hibook:post-created", refreshAfterPost);
  }, [scope]);

  return (
    <section aria-label="Post feed" aria-busy={loading || refreshing} className="space-y-5">
      <div className="overflow-hidden rounded-[1.25rem] border border-[#d8d2c6] bg-[#fffdf8] shadow-none">
        <div className="flex flex-col gap-3 border-b border-[#d8d2c6] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#858983]">Community feed</p>
            <p className="mt-1 text-sm text-[#5d625f]">{scopeDescription(scope)}</p>
          </div>
          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={loading || loadingMore || refreshing}
              className="rounded-xl border border-[#d8d2c6] bg-[#fffdf8] px-3 py-2 text-xs font-bold text-[#5d625f] transition hover:border-[#111827] hover:bg-[#f7f3ea] hover:text-[#111827] disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Refresh community feed"
            >
              {refreshing ? "Refreshing…" : "Refresh"}
            </button>
            <div className="flex min-w-0 flex-1 gap-1 rounded-xl bg-[#f0ece3] p-1 sm:flex-none" role="tablist" aria-label="Feed views">
              {(["HOME", "FOLLOWING", "EXPLORE"] as Scope[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  role="tab"
                  aria-selected={scope === item}
                  onClick={() => {
                    setScope(item);
                    void load(item);
                  }}
                  className={`min-w-0 flex-1 rounded-lg px-2 py-2 text-xs font-bold transition sm:flex-none sm:px-4 sm:text-sm ${scope === item ? "bg-slate-950 text-white shadow-sm" : "text-[#5d625f] hover:text-slate-900"}`}
                >
                  {item === "HOME" ? "Home" : item === "FOLLOWING" ? "Following" : "Explore"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {error && <p className="rounded-xl border border-[#f0b5a7] bg-[#fff0ec] px-4 py-3 text-sm text-[#9f3d2b]" role="alert">{error}</p>}
      {loading && (
        <div className="space-y-4" aria-live="polite">
          {[1, 2].map((item) => (
            <div key={item} className="animate-pulse rounded-[1.25rem] border border-[#d8d2c6] bg-[#fffdf8] p-5 shadow-none">
              <div className="flex gap-3">
                <div className="h-11 w-11 rounded-2xl bg-[#e4dfd4]" />
                <div className="flex-1">
                  <div className="h-4 w-32 rounded bg-[#e4dfd4]" />
                  <div className="mt-2 h-3 w-20 rounded bg-[#f0ece3]" />
                </div>
              </div>
              <div className="mt-5 h-20 rounded-xl bg-[#f0ece3]" />
            </div>
          ))}
        </div>
      )}

      {!loading && posts.length === 0 && (
        <div className="rounded-[1.5rem] border border-dashed border-[#bcb5a7] bg-[#fffdf8] px-6 py-14 text-center shadow-none">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#111827] font-black text-[#f7f3ea]">H!</div>
          <h2 className="mt-5 font-bold text-[#111827]">Your feed is ready for something new.</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#5d625f]">Follow people you connect with or share your first post. Your feed will grow with you.</p>
          <Link href="/discover" className="mt-6 inline-flex rounded-full bg-[#111827] px-5 py-2.5 text-sm font-semibold text-[#f7f3ea] transition hover:bg-[#c94d35]">Discover people</Link>
        </div>
      )}

      {!loading && posts.map((post) => {
        const like = likes[post.post_id] ?? { liked: false, like_count: 0 };
        return (
          <article key={post.post_id} className="overflow-hidden rounded-[1.25rem] border border-[#d8d2c6] bg-[#fffdf8] shadow-none transition hover:shadow-md">
            <header className="flex items-center gap-3 px-5 py-5">
              <Link href={`/u/${post.username}`} className="h-11 w-11 shrink-0 overflow-hidden rounded-2xl bg-[#f0ece3]" aria-label={`View ${post.display_name} profile`}>
                {post.avatar_url ? <img src={post.avatar_url} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-900 to-slate-700 font-bold text-white">{post.display_name.charAt(0).toUpperCase()}</div>}
              </Link>
              <div className="min-w-0 flex-1">
                <Link href={`/u/${post.username}`} className="font-bold text-[#111827] hover:underline">{post.display_name}</Link>
                <p className="truncate text-sm text-[#5d625f]">@{post.username} · {timeAgo(post.created_at)}</p>
              </div>
              <span className="rounded-full bg-[#f0ece3] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#5d625f]">{post.visibility === "FOLLOWERS" ? "Followers" : post.visibility === "PRIVATE" ? "Private" : "Public"}</span>
            </header>

            {post.content && <p className="whitespace-pre-wrap px-5 pb-5 text-[15px] leading-7 text-[#111827]">{post.content}</p>}
            {post.media.length > 0 && (
              <div className={`grid gap-1 ${post.media.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
                {post.media.map((media) => (
                  <img
                    key={media.id}
                    src={media.url}
                    alt={media.alt_text ?? "Post image"}
                    width={media.width ?? undefined}
                    height={media.height ?? undefined}
                    className="max-h-[640px] w-full bg-[#f0ece3] object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                ))}
              </div>
            )}

            <footer className="flex flex-wrap items-center gap-2 border-t border-[#d8d2c6] px-5 py-3">
              <button type="button" onClick={() => void toggleLike(post.post_id)} disabled={likeBusy[post.post_id]} aria-pressed={like.liked} className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${like.liked ? "bg-red-50 text-red-700" : "text-slate-600 hover:bg-[#f0ece3]"}`}>
                {like.liked ? "♥ Liked" : "♡ Like"} <span className="ml-1">{like.like_count}</span>
              </button>
              <PostShareButton postId={post.post_id} />
            </footer>
            <PostComments postId={post.post_id} />
          </article>
        );
      })}

      {!loading && cursor && (
        <button type="button" onClick={() => void load(scope, cursor, true)} disabled={loadingMore} className="w-full rounded-xl border border-[#d8d2c6] bg-[#fffdf8] px-4 py-3 text-sm font-semibold text-[#5d625f] shadow-none transition hover:bg-[#f0ece3] disabled:opacity-50">
          {loadingMore ? "Loading more…" : "Load more posts"}
        </button>
      )}
    </section>
  );
}
