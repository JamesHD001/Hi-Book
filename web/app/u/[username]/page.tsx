import { notFound } from "next/navigation";
import Link from "next/link";
import { requireActiveUser } from "@/lib/auth/require-active-user";
import FollowButton from "@/components/social/FollowButton";
import BlockButton from "@/components/social/BlockButton";
import ReportDialog from "@/components/social/ReportDialog";
import StartConversationButton from "@/components/messaging/StartConversationButton";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ username: string }> };

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
        <main className="min-h-screen bg-slate-50/80">
          <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="h-32 bg-slate-950" />
              <div className="px-6 py-8 sm:px-8">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">Your profile</p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">This is your profile.</h1>
                <p className="mt-3 max-w-2xl leading-7 text-slate-600">Manage your public identity, privacy settings, and how people discover you from your profile settings.</p>
                <Link href="/profile" className="mt-6 inline-flex rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">
                  Edit profile →
                </Link>
              </div>
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

  const displayName = String(profile.display_name ?? "");
  const initials = displayName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part: string) => part[0])
    .join("")
    .toUpperCase();

  return (
    <main className="min-h-screen bg-slate-50/80">
      <section className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="relative h-36 overflow-hidden bg-slate-950 sm:h-44">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.32),transparent_36%),radial-gradient(circle_at_80%_10%,rgba(168,85,247,0.24),transparent_34%)]" />
            <div className="absolute bottom-4 left-5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white/80 backdrop-blur sm:left-8">
              Public profile
            </div>
          </div>

          <div className="px-5 pb-7 sm:px-8 sm:pb-9">
            <div className="-mt-12 flex flex-col gap-6 lg:-mt-14 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex items-end gap-4">
                {avatarData?.signedUrl ? (
                  <img src={avatarData.signedUrl} alt={`${profile.display_name} profile picture`} className="h-24 w-24 rounded-[1.6rem] border-4 border-white object-cover shadow-lg sm:h-28 sm:w-28" />
                ) : (
                  <div aria-hidden="true" className="flex h-24 w-24 items-center justify-center rounded-[1.6rem] border-4 border-white bg-slate-900 text-2xl font-bold text-white shadow-lg sm:h-28 sm:w-28">
                    {initials || "?"}
                  </div>
                )}
                <div className="pb-1">
                  <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">{profile.display_name}</h1>
                  <p className="mt-1 text-sm font-medium text-slate-500">@{profile.username}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <FollowButton targetUserId={profile.user_id} initialFollowing={Boolean(followStats.is_following)} />
                <StartConversationButton targetUserId={profile.user_id} />
                <BlockButton targetUserId={profile.user_id} />
                <ReportDialog targetId={profile.user_id} />
              </div>
            </div>

            <div className="mt-7 grid gap-4 lg:grid-cols-[1fr_280px]">
              <div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 sm:p-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">About</p>
                  {profile.bio ? (
                    <p className="mt-3 whitespace-pre-wrap leading-7 text-slate-700">{profile.bio}</p>
                  ) : (
                    <p className="mt-3 text-sm leading-6 text-slate-500">This person has not added a bio yet.</p>
                  )}
                </div>
              </div>

              <aside className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-2xl font-bold text-slate-950">{followStats.followers_count}</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Followers</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-2xl font-bold text-slate-950">{followStats.following_count}</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Following</p>
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-950 p-5 text-white">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-300">Hi!Book identity</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">Connect, follow, or start a private conversation while keeping personal profile details under their visibility controls.</p>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
