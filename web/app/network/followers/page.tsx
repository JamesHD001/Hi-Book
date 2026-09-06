import NetworkList from "@/components/social/NetworkList";
import { requireActiveUser } from "@/lib/auth/require-active-user";

export const dynamic = "force-dynamic";

export default async function FollowersPage() {
  const { supabase, user } = await requireActiveUser();

  const { data: follows } = await supabase
    .from("follows")
    .select("follower_id, created_at")
    .eq("following_id", user.id)
    .order("created_at", { ascending: false });

  const ids = follows?.map((item) => item.follower_id) ?? [];
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

      const base = {
        userId: profile.user_id,
        username: profile.username,
        displayName: profile.display_name,
        bio: profile.bio,
      };

      return [
        profile.avatar_path
          ? supabase.storage.from("avatars").createSignedUrl(profile.avatar_path, 600).then(({ data }) => ({
              ...base,
              avatarUrl: data?.signedUrl ?? null,
            }))
          : Promise.resolve({ ...base, avatarUrl: null }),
      ];
    }),
  );

  return (
    <NetworkList
      title="Your followers"
      description="People who currently follow you."
      users={users}
    />
  );
}
