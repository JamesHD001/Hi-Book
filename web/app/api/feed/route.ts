import { NextRequest, NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/auth/require-active-user";

export const dynamic = "force-dynamic";
const SCOPES = new Set(["HOME", "FOLLOWING", "EXPLORE"]);

export async function GET(request: NextRequest) {
  try {
    const { supabase } = await requireActiveUser();
    const scope = (request.nextUrl.searchParams.get("scope") ?? "HOME").toUpperCase();
    if (!SCOPES.has(scope)) return NextResponse.json({ error: "Invalid feed scope." }, { status: 400 });
    const beforeCreatedAt = request.nextUrl.searchParams.get("before_created_at");
    const beforePostId = request.nextUrl.searchParams.get("before_post_id");
    const { data, error } = await supabase.rpc("get_post_feed", { feed_scope: scope, page_limit: 21, before_created_at: beforeCreatedAt || null, before_post_id: beforePostId || null });
    if (error) throw error;
    const rows = data ?? [];
    const page = rows.slice(0, 20);
    const posts = await Promise.all(page.map(async (post) => {
      let avatarUrl: string | null = null;
      if (post.avatar_path) {
        const { data: signed } = await supabase.storage.from("avatars").createSignedUrl(post.avatar_path, 600);
        avatarUrl = signed?.signedUrl ?? null;
      }
      const media = await Promise.all((Array.isArray(post.media) ? post.media : []).map(async (item: { id: string; storage_path: string; width: number | null; height: number | null; display_order: number; alt_text: string | null }) => {
        const { data: signed } = await supabase.storage.from("posts").createSignedUrl(item.storage_path, 600);
        return { id: item.id, url: signed?.signedUrl ?? "", width: item.width, height: item.height, display_order: item.display_order, alt_text: item.alt_text };
      }));
      return { post_id: post.post_id, author_id: post.author_id, username: post.username, display_name: post.display_name, avatar_url: avatarUrl, content: post.content, visibility: post.visibility, created_at: post.created_at, published_at: post.published_at, media: media.filter((item) => item.url) };
    }));
    const last = page.at(-1);
    return NextResponse.json({ posts, next_cursor: rows.length > 20 && last ? { created_at: last.created_at, post_id: last.post_id } : null });
  } catch (error) {
    console.error("Feed request failed", error);
    return NextResponse.json({ error: "Unable to load the feed." }, { status: 500 });
  }
}
