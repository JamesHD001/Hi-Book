"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type FeedMedia = {
  id: string;
  url: string;
  width: number | null;
  height: number | null;
  display_order: number;
  alt_text: string | null;
};

type FeedPost = {
  post_id: string;
  author_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  content: string | null;
  visibility: "PUBLIC" | "FOLLOWERS" | "PRIVATE";
  created_at: string;
  published_at: string;
  media: FeedMedia[];
};

type Scope = "HOME" | "FOLLOWING" | "EXPLORE";

function formatTime(value: string) {
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)}d`;
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export default function PostFeed({ initialPosts }: { initialPosts: FeedPost[] }) {
  const [scope, setScope] = useState<Scope>("HOME");
  const [posts, setPosts] = useState(initialPosts);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const refresh = () => window.location.reload();
    window.addEventListener("hibook:post-created", refresh);
    return () => window.removeEventListener("hibook:post-created", refresh);
  }, []);

  async function loadScope(nextScope: Scope) {
    if (nextScope === scope) return;
    setScope(nextScope);
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/feed?scope=${nextScope}`, { cache: "no-store" });
      const payload = (await response.json()) as { posts?: FeedPost[]; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Could not load the feed.");
      setPosts(payload.posts ?? []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load the feed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section aria-label="Post feed" className="space-y-4">
      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        {(["HOME", "FOLLOWING", "EXPLORE"] as Scope[]).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => loadScope(item)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${scope === item ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-100"}`}
            aria-pressed={scope === item}
          >
            {item === "HOME" ? "Home" : item === "FOLLOWING" ? "Following" : "Explore"}
          </button>
        ))}
      </div>

      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>}
      {loading && <p className="rounded-xl border border-slate-200 bg-white px-4 py-5 text-sm text-slate-500">Loading posts…</p>}

      {!loading && posts.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <h2 className="font-semibold text-slate-950">Nothing here yet</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">Follow people or share your first post to start building your feed.</p>
        </div>
      )}

      {!loading && posts.map((post) => (
        <article key={post.post_id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <header className="flex items-center gap-3 p-5">
            <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full bg-slate-100">
              {post.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={post.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm font-bold text-slate-500">{post.display_name.charAt(0).toUpperCase()}</div>
              )}
            </div>
            <div className="min-w-0">
              <Link href={`/u/${post.username}`} className="font-semibold text-slate-950 hover:underline">{post.display_name}</Link>
              <p className="truncate text-sm text-slate-500">@{post.username} · {formatTime(post.created_at)}</p>
            </div>
          </header>

          {post.content && <p className="whitespace-pre-wrap px-5 pb-5 text-[15px] leading-7 text-slate-800">{post.content}</p>}

          {post.media.length > 0 && (
            <div className={`grid gap-1 ${post.media.length === 1 ? "grid-cols-1" : post.media.length === 2 ? "grid-cols-2" : "grid-cols-2"}`}>
              {post.media.map((media) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={media.id}
                  src={media.url}
                  alt={media.alt_text ?? "Post image"}
                  width={media.width ?? undefined}
                  height={media.height ?? undefined}
                  className="max-h-[640px] w-full bg-slate-100 object-cover"
                  loading="lazy"
                />
              ))}
            </div>
          )}

          <footer className="border-t border-slate-100 px-5 py-3 text-sm text-slate-500">Post visibility: {post.visibility === "PUBLIC" ? "Everyone" : post.visibility === "FOLLOWERS" ? "Followers" : "Only me"}</footer>
        </article>
      ))}
    </section>
  );
}
