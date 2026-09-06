import { notFound } from "next/navigation";
import Link from "next/link";
import { requireActiveUser } from "@/lib/auth/require-active-user";
import FollowButton from "@/components/social/FollowButton";
import BlockButton from "@/components/social/BlockButton";
import ReportDialog from "@/components/social/ReportDialog";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ username: string }>;
};

export default async function PublicProfilePage({ params }: PageProps) {
  const { supabase, user } = await requireActiveUser();
  const { username } = await params;
  const normalized = username.trim().toLowerCase();

  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id, username, display_name, bio, avatar_path")
    .eq("username_normalized", normalized)
    .maybeSingle();

  if (!profile || profile.user_id === user.id) {
    if (profile?.user_id === user.id) {
      return (
        <main>
          <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
            <div className="rounded-3xl border border-slate-200 bg-white p-8">
              <p className="text-sm text-slate-500">This is your profile.</p>
              <h1 className="mt-2 text-3xl font-bold">{profile.display_name}</h1>
              <Link href="/profile" className="mt-5 inline-block text-sm font-semibold text-blue-600">
                Edit profile →
              </Link>
            </div>
          </section>
        </main>
      );
    }
    notFound();
  }

  const [{ data: avatarData }, { data: stats }] = await Promise.all([
    profile.avatar_path
      ? supabase.storage.from("avatars").createSignedUrl(profile.avatar_path, 600)
      : Promise.resolve({ data: null }),
    supabase.rpc("get_follow_stats", { target_user_id: profile.user_id }),
  ]);

  const followStats = Array.isArray(stats) ? stats[0] : stats;

  if (!followStats) notFound();

  return (
    <main>
      <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="h-28 bg-slate-950" />
          <div className="px-6 pb-7 sm:px-8">
            <div className="-mt-12 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-end gap-4">
                {avatarData?.signedUrl ? (
                  <img
                    src={avatarData.signedUrl}
                    alt={`${profile.display_name} profile picture`}
                    className="h-24 w-24 rounded-full border-4 border-white object-cover"
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-white bg-slate-200 text-2xl font-bold text-slate-600">
                    {profile.display_name?.charAt(0).toUpperCase() ?? "?"}
                  </div>
                )}
                <div className="pb-1">
                  <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">{profile.display_name}</h1>
                  <p className="text-sm text-slate-500">@{profile.username}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <FollowButton
                  targetUserId={profile.user_id}
                  initialFollowing={Boolean(followStats.is_following)}
                />
                <BlockButton targetUserId={profile.user_id} />
                <ReportDialog targetId={profile.user_id} />
              </div>
            </div>

            {profile.bio && <p className="mt-6 max-w-2xl whitespace-pre-wrap leading-7 text-slate-700">{profile.bio}</p>}

            <div className="mt-7 flex flex-wrap gap-6 border-t border-slate-100 pt-5 text-sm">
              <Link href={`/u/${profile.username}/followers`} className="hover:text-blue-600">
                <strong className="text-slate-950">{followStats.followers_count}</strong> followers
              </Link>
              <Link href={`/u/${profile.username}/following`} className="hover:text-blue-600">
                <strong className="text-slate-950">{followStats.following_count}</strong> following
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
