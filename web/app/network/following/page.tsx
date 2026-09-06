import NetworkList from "@/components/social/NetworkList";
import { requireActiveUser } from "@/lib/auth/require-active-user";

export const dynamic = "force-dynamic";

export default async function FollowingPage() {
  const { supabase, user } = await requireActiveUser();

  const { data: follows } = await supabase
    .from("follows")
    .select("following_id, created_at")
    .eq("follower_id", user.id)
    .order("created_at", { ascending: false });

  const ids = follows?.map((item) => item.following_id) ?? [];
  const { data: profiles } = ids.length
    ? await supabase
        .from("profiles")
        .select("user_id, username, display_name, bio, avatar_path")
        .in("user_id", ids)
    : { data: [] };

  const profileMap = new Map((profiles ?? []).map((profile) => [profile.user_id, profile]));
  const users = await Promise.all(
    ids.flatMap((id) => {
      const profile = profileMap.get(id);
      if (!profile) return [];
      return [
        profile.avatar_path
          ? supabase.storage.from("avatars").createSignedUrl(profile.avatar_path, 600).then(({ data }) => ({
              userId: profile.user_id,
              username: profile.username,
              displayName: profile.display_name,
              bio: profile.bio,
              avatarUrl: data?.signedUrl ?? null,
            }))
          : Promise.resolve({
              userId: profile.user_id,
              username: profile.username,
              displayName: profile.display_name,
              bio: profile.bio,
              avatarUrl: null,
            }),
      ];
    }),
  );

  return (
    <NetworkList
      title="People you follow"
      description="Accounts you currently follow."
      users={users}
    />
  );
}
