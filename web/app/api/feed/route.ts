import { NextRequest, NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/auth/require-active-user";

export const dynamic = "force-dynamic";
const SCOPES = new Set(["HOME", "FOLLOWING", "EXPLORE"]);

type FeedMediaRow = {
  id: string;
  storage_path: string;
  width: number | null;
  height: number | null;
  display_order: number;
  alt_text: string | null;
};

type FeedRow = {
  post_id: string;
  author_id: string;
  username: string;
  display_name: string;
  avatar_path: string | null;
  content: string | null;
  visibility: "PUBLIC" | "FOLLOWERS" | "PRIVATE";
  created_at: string;
  published_at: string;
  media: FeedMediaRow[] | null;
};

export async function GET(request: NextRequest) {
  try {
    const { supabase } = await requireActiveUser();
    const scope = (request.nextUrl.searchParams.get("scope") ?? "HOME").toUpperCase();
    if (!SCOPES.has(scope)) return NextResponse.json({ error: "Invalid feed scope." }, { status: 400 });
    const beforeCreatedAt = request.nextUrl.searchParams.get("before_created_at");
    const beforePostId = request.nextUrl.searchParams.get("before_post_id");
    const { data, error } = await supabase.rpc("get_post_feed", { feed_scope: scope, page_limit: 21, before_created_at: beforeCreatedAt || null, before_post_id: beforePostId || null });
    if (error) throw error;
    const rows = (data ?? []) as FeedRow[];
    const page = rows.slice(0, 20);

    const avatarPaths = Array.from(new Set(page.map((post) => post.avatar_path).filter((path): path is string => Boolean(path))));
    const mediaPaths = Array.from(new Set(page.flatMap((post) => (Array.isArray(post.media) ? post.media : []).map((item) => item.storage_path))));
    const [{ data: avatarUrls }, { data: mediaUrls }] = await Promise.all([
      avatarPaths.length ? supabase.storage.from("avatars").createSignedUrls(avatarPaths, 600) : Promise.resolve({ data: [] }),
      mediaPaths.length ? supabase.storage.from("posts").createSignedUrls(mediaPaths, 600) : Promise.resolve({ data: [] }),
    ]);
    const avatarMap = new Map((avatarUrls ?? []).map((item) => [item.path, item.signedUrl]));
    const mediaMap = new Map((mediaUrls ?? []).map((item) => [item.path, item.signedUrl]));

    const posts = page.map((post) => {
      const media = (Array.isArray(post.media) ? post.media : []).map((item) => ({
        id: item.id,
        url: mediaMap.get(item.storage_path) ?? "",
        width: item.width,
        height: item.height,
        display_order: item.display_order,
        alt_text: item.alt_text,
      }));
      return { post_id: post.post_id, author_id: post.author_id, username: post.username, display_name: post.display_name, avatar_url: post.avatar_path ? avatarMap.get(post.avatar_path) ?? null : null, content: post.content, visibility: post.visibility, created_at: post.created_at, published_at: post.published_at, media: media.filter((item) => item.url) };
    });
    const last = page.at(-1);
    return NextResponse.json({ posts, next_cursor: rows.length > 20 && last ? { created_at: last.created_at, post_id: last.post_id } : null });
  } catch (error) {
    console.error("Feed request failed", error);
    return NextResponse.json({ error: "Unable to load the feed." }, { status: 500 });
  }
}
