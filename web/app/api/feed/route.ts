import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireActiveUser } from "@/lib/auth/require-active-user";

export const dynamic = "force-dynamic";

const SCOPES = new Set(["HOME", "FOLLOWING", "EXPLORE"]);

export async function GET(request: NextRequest) {
  try {
    const { supabase } = await requireActiveUser();
    const scopeParam = request.nextUrl.searchParams.get("scope") ?? "HOME";
    const scope = scopeParam.toUpperCase();
    if (!SCOPES.has(scope)) {
      return NextResponse.json({ error: "Invalid feed scope." }, { status: 400 });
    }

    const { data, error } = await supabase.rpc("get_post_feed", {
      feed_scope: scope,
      page_limit: 20,
      before_created_at: null,
      before_post_id: null,
    });
    if (error) throw error;

    const posts = await Promise.all(
      (data ?? []).map(async (post) => {
        let avatarUrl: string | null = null;
        if (post.avatar_path) {
          const { data: signed } = await supabase.storage.from("avatars").createSignedUrl(post.avatar_path, 600);
          avatarUrl = signed?.signedUrl ?? null;
        }

        const rawMedia = Array.isArray(post.media) ? post.media : [];
        const media = await Promise.all(
          rawMedia.map(async (item: { id: string; storage_path: string; mime_type: string | null; width: number | null; height: number | null; display_order: number; alt_text: string | null }) => {
            const { data: signed } = await supabase.storage.from("posts").createSignedUrl(item.storage_path, 600);
            return {
              id: item.id,
              url: signed?.signedUrl ?? "",
              width: item.width,
              height: item.height,
              display_order: item.display_order,
              alt_text: item.alt_text,
            };
          }),
        );

        return {
          post_id: post.post_id,
          author_id: post.author_id,
          username: post.username,
          display_name: post.display_name,
          avatar_url: avatarUrl,
          content: post.content,
          visibility: post.visibility,
          created_at: post.created_at,
          published_at: post.published_at,
          media: media.filter((item) => item.url),
        };
      }),
    );

    return NextResponse.json({ posts });
  } catch (error) {
    console.error("Feed request failed", error);
    return NextResponse.json({ error: "Unable to load the feed." }, { status: 500 });
  }
}
