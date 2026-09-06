import { requireActiveUser } from "@/lib/auth/require-active-user";
import ProfileEditor from "@/components/profile/ProfileEditor";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const { supabase, user } = await requireActiveUser();

  const [{ data: profile }, { data: account }, { data: privacy }, { data: languages }, { data: interests }, { data: userLanguages }, { data: userInterests }] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, username, bio, avatar_path")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase.from("users").select("country_code").eq("id", user.id).maybeSingle(),
    supabase
      .from("user_privacy_settings")
      .select("profile_visibility, country_visibility, message_permission, discoverable")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase.from("language").select("id, name, code").order("name"),
    supabase.from("interest").select("id, name").order("name"),
    supabase.from("user_language").select("language_id").eq("user_id", user.id),
    supabase.from("user_interest").select("interest_id").eq("user_id", user.id),
  ]);

  let avatarUrl: string | null = null;
  if (profile?.avatar_path) {
    const { data } = await supabase.storage
      .from("avatars")
      .createSignedUrl(profile.avatar_path, 600);
    avatarUrl = data?.signedUrl ?? null;
  }

  return (
    <main>
      <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">Your profile</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Make your profile yours.</h1>
          <p className="mt-3 max-w-2xl leading-7 text-slate-600">
            Choose what you want people to know about you and how discoverable you want to be.
          </p>
          {profile?.username && <p className="mt-3 text-sm text-slate-500">Your username: @{profile.username}</p>}
        </div>

        <ProfileEditor
          userId={user.id}
          initial={{
            displayName: profile?.display_name ?? "",
            bio: profile?.bio ?? "",
            countryCode: account?.country_code?.trim() ?? "",
            profileVisibility: privacy?.profile_visibility ?? "PUBLIC",
            countryVisibility: privacy?.country_visibility ?? "PUBLIC",
            messagePermission: privacy?.message_permission ?? "FOLLOWERS",
            discoverable: privacy?.discoverable ?? true,
            languageIds: userLanguages?.map((item) => item.language_id) ?? [],
            interestIds: userInterests?.map((item) => item.interest_id) ?? [],
            avatarUrl,
          }}
          languages={languages ?? []}
          interests={interests ?? []}
        />
      </section>
    </main>
  );
}
