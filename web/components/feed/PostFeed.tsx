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
    return (
    <section
      aria-label="Post feed"
      aria-busy={loading || refreshing}
      className="hb-feed"
    >
      <header className="hb-card hb-feed__controls">
        <div className="hb-card__header">
          <div>
            <p className="hb-eyebrow hb-eyebrow--muted">Community feed</p>
            <p className="hb-feed__description">{scopeDescription(scope)}</p>
          </div>

          <div className="hb-feed__actions">
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={loading || loadingMore || refreshing}
              className="hb-button hb-button--secondary hb-button--sm"
              aria-label="Refresh community feed"
            >
              {refreshing ? "Refreshing…" : "Refresh"}
            </button>

            <div className="hb-segmented" role="tablist" aria-label="Feed views">
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
                  className="hb-segmented__item"
                >
                  {item === "HOME"
                    ? "Home"
                    : item === "FOLLOWING"
                      ? "Following"
                      : "Explore"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {error && (
        <p className="hb-status hb-status--error" role="alert">
          {error}
        </p>
      )}

      {loading && (
        <div className="hb-feed__loading" aria-live="polite">
          {[1, 2].map((item) => (
            <div key={item} className="hb-card hb-feed-skeleton">
              <div className="hb-feed-skeleton__head">
                <div className="hb-skeleton hb-avatar hb-avatar--44" />
                <div className="hb-feed-skeleton__copy">
                  <div className="hb-skeleton hb-feed-skeleton__title" />
                  <div className="hb-skeleton hb-feed-skeleton__meta" />
                </div>
              </div>
              <div className="hb-skeleton hb-feed-skeleton__body" />
            </div>
          ))}
        </div>
      )}

      {!loading && posts.length === 0 && (
        <div className="hb-empty">
          <div className="hb-empty__icon" aria-hidden="true">H!</div>
          <h2 className="hb-empty__title">
            Your feed is ready for something new.
          </h2>
          <p className="hb-empty__text">
            Follow people you connect with or share your first post. Your feed
            will grow with you.
          </p>
          <div className="hb-empty__actions">
            <Link href="/discover" className="hb-button hb-button--primary">
              Discover people
            </Link>
          </div>
        </div>
      )}

      {!loading &&
        posts.map((post) => {
          const like = likes[post.post_id] ?? {
            liked: false,
            like_count: 0,
          };

          return (
            <article key={post.post_id} className="hb-card hb-post">
              <header className="hb-post__header">
                <Link
                  href={`/u/${post.username}`}
                  className="hb-avatar hb-avatar--48 hb-avatar--square hb-post__avatar"
                  aria-label={`View ${post.display_name} profile`}
                >
                  {post.avatar_url ? (
                    <img
                      src={post.avatar_url}
                      alt=""
                      className="hb-post__avatar-image"
                    />
                  ) : (
                    post.display_name.charAt(0).toUpperCase()
                  )}
                </Link>

                <div className="hb-post__identity">
                  <Link
                    href={`/u/${post.username}`}
                    className="hb-post__name"
                  >
                    {post.display_name}
                  </Link>
                  <p className="hb-post__meta">
                    @{post.username} · {timeAgo(post.created_at)}
                  </p>
                </div>

                <span className="hb-badge">
                  {post.visibility === "FOLLOWERS"
                    ? "Followers"
                    : post.visibility === "PRIVATE"
                      ? "Private"
                      : "Public"}
                </span>
              </header>

              {post.content && (
                <p className="hb-post__content">{post.content}</p>
              )}

              {post.media.length > 0 && (
                <div
                  className={
                    post.media.length === 1
                      ? "hb-post__media hb-post__media--single"
                      : "hb-post__media hb-post__media--grid"
                  }
                >
                  {post.media.map((media) => (
                    <img
                      key={media.id}
                      src={media.url}
                      alt={media.alt_text ?? "Post image"}
                      width={media.width ?? undefined}
                      height={media.height ?? undefined}
                      className="hb-post__media-image"
                      loading="lazy"
                      decoding="async"
                    />
                  ))}
                </div>
              )}

              <footer className="hb-post__footer">
                <button
                  type="button"
                  onClick={() => void toggleLike(post.post_id)}
                  disabled={likeBusy[post.post_id]}
                  aria-pressed={like.liked}
                  className={
                    like.liked
                      ? "hb-post__action hb-post__action--liked"
                      : "hb-post__action"
                  }
                >
                  {like.liked ? "♥ Liked" : "♡ Like"}{" "}
                  <span>{like.like_count}</span>
                </button>
                <PostShareButton postId={post.post_id} />
              </footer>

              <PostComments postId={post.post_id} />
            </article>
          );
        })}

      {!loading && cursor && (
        <button
          type="button"
          onClick={() => void load(scope, cursor, true)}
          disabled={loadingMore}
          className="hb-button hb-button--secondary hb-button--block"
        >
          {loadingMore ? "Loading more…" : "Load more posts"}
        </button>
      )}
    </section>
  );

