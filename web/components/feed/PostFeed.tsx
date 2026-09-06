"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

type FeedMedia = { id: string; url: string; width: number | null; height: number | null; alt_text: string | null };
type FeedPost = { post_id: string; username: string; display_name: string; avatar_url: string | null; content: string | null; visibility: "PUBLIC" | "FOLLOWERS" | "PRIVATE"; created_at: string; media: FeedMedia[] };
type Scope = "HOME" | "FOLLOWING" | "EXPLORE";
type Cursor = { created_at: string; post_id: string } | null;

function timeAgo(value: string) { const diff = Date.now() - new Date(value).getTime(); if (diff < 60000) return "Just now"; if (diff < 3600000) return `${Math.floor(diff / 60000)}m`; if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`; if (diff < 604800000) return `${Math.floor(diff / 86400000)}d`; return new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }); }

export default function PostFeed() {
  const [scope, setScope] = useState<Scope>("HOME"); const [posts, setPosts] = useState<FeedPost[]>([]); const [cursor, setCursor] = useState<Cursor>(null); const [loading, setLoading] = useState(true); const [loadingMore, setLoadingMore] = useState(false); const [error, setError] = useState<string | null>(null);
  async function load(nextScope: Scope, nextCursor: Cursor = null, append = false) {
    append ? setLoadingMore(true) : setLoading(true); setError(null);
    try { const params = new URLSearchParams({ scope: nextScope }); if (nextCursor) { params.set("before_created_at", nextCursor.created_at); params.set("before_post_id", nextCursor.post_id); } const response = await fetch(`/api/feed?${params}`, { cache: "no-store" }); const payload = (await response.json()) as { posts?: FeedPost[]; next_cursor?: Cursor; error?: string }; if (!response.ok) throw new Error(payload.error ?? "Could not load the feed."); setPosts((current) => append ? [...current, ...(payload.posts ?? [])] : (payload.posts ?? [])); setCursor(payload.next_cursor ?? null); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Could not load the feed."); } finally { setLoading(false); setLoadingMore(false); }
  }
  useEffect(() => { void load("HOME"); }, []);
  useEffect(() => { const refresh = () => void load(scope); window.addEventListener("hibook:post-created", refresh); return () => window.removeEventListener("hibook:post-created", refresh); }, [scope]);
  return <section aria-label="Post feed" className="space-y-4">
    <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">{(["HOME", "FOLLOWING", "EXPLORE"] as Scope[]).map((item) => <button key={item} type="button" onClick={() => { setScope(item); void load(item); }} className={`rounded-xl px-4 py-2 text-sm font-semibold ${scope === item ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-100"}`}>{item === "HOME" ? "Home" : item === "FOLLOWING" ? "Following" : "Explore"}</button>)}</div>
    {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>}
    {loading && <p className="rounded-xl border border-slate-200 bg-white px-4 py-5 text-sm text-slate-500">Loading posts…</p>}
    {!loading && posts.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center"><h2 className="font-semibold">Nothing here yet</h2><p className="mt-2 text-sm text-slate-500">Follow people or share your first post to start your feed.</p></div>}
    {!loading && posts.map((post) => <article key={post.post_id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="flex items-center gap-3 p-5"><div className="h-11 w-11 shrink-0 overflow-hidden rounded-full bg-slate-100">{post.avatar_url ? <img src={post.avatar_url} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center font-bold text-slate-500">{post.display_name.charAt(0).toUpperCase()}</div>}</div><div className="min-w-0"><Link href={`/u/${post.username}`} className="font-semibold text-slate-950 hover:underline">{post.display_name}</Link><p className="truncate text-sm text-slate-500">@{post.username} · {timeAgo(post.created_at)}</p></div></header>
      {post.content && <p className="whitespace-pre-wrap px-5 pb-5 text-[15px] leading-7 text-slate-800">{post.content}</p>}
      {post.media.length > 0 && <div className={`grid gap-1 ${post.media.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>{post.media.map((media) => <img key={media.id} src={media.url} alt={media.alt_text ?? "Post image"} width={media.width ?? undefined} height={media.height ?? undefined} className="max-h-[640px] w-full bg-slate-100 object-cover" loading="lazy" />)}</div>}
    </article>)}
    {!loading && cursor && <button type="button" onClick={() => void load(scope, cursor, true)} disabled={loadingMore} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50">{loadingMore ? "Loading more…" : "Load more"}</button>}
  </section>;
}
