import { requireActiveUser } from "@/lib/auth/require-active-user";
import AccountDeletionPanel from "@/components/profile/AccountDeletionPanel";
import ProfileEditor from "@/components/profile/ProfileEditor";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const { supabase, user } = await requireActiveUser();

  const profileData = await Promise.all([
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
  const profileQueryError = profileData.find(({ error }) => error)?.error;
  if (profileQueryError) throw profileQueryError;

  const [{ data: profile }, { data: account }, { data: privacy }, { data: languages }, { data: interests }, { data: userLanguages }, { data: userInterests }] = profileData;

  let avatarUrl: string | null = null;
  if (profile?.avatar_path) {
    const { data } = await supabase.storage
      .from("avatars")
      .createSignedUrl(profile.avatar_path, 600);
    avatarUrl = data?.signedUrl ?? null;
  }

  const displayName = profile?.display_name?.trim() || "Hi!Book member";
  const username = profile?.username ? `@${profile.username}` : "Choose a username";
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part: string) => part[0])
    .join("")
    .toUpperCase();
  const visibilityLabel = privacy?.profile_visibility === "PRIVATE" ? "Private profile" : "Public profile";
  const discoveryLabel = privacy?.discoverable === false ? "Not discoverable" : "Discoverable";

  return (
    <main className="min-h-screen bg-[var(--background)] pb-16">
      <section className="relative overflow-hidden border-b border-[var(--border)] bg-[var(--surface-inverse)] text-[var(--on-inverse)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,184,169,0.20),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(255,200,0,0.12),transparent_28%)]" />
        <div className="relative mx-auto max-w-6xl px-4 pb-12 pt-8 sm:px-6 lg:px-8 lg:pb-14">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--brand-primary)]">
            <span className="h-2 w-2 rounded-full bg-[var(--brand-primary)]" />
            Profiles & identity
          </div>
          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-sm font-medium text-[var(--text-secondary)]">Your identity on Hi!Book</p>
              <h1 className="mt-2 max-w-3xl text-4xl font-semibold tracking-tight text-[var(--on-inverse)] sm:text-5xl">
                Make your profile feel like you.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--text-secondary)] sm:text-lg">
                Shape the way people discover you, learn about you, and connect with you — while keeping control of what stays private.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">Account identity</p>
              <p className="mt-2 text-sm font-medium text-[var(--on-inverse)]">{username}</p>
            </div>
          </div>

          <div className="mt-10 rounded-3xl border border-white/10 bg-white/[0.05] p-5 shadow-[var(--shadow-lg)] backdrop-blur-md sm:p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[linear-gradient(135deg,var(--brand-primary),var(--brand-primary-dark))] text-2xl font-bold text-white ring-4 ring-white/10">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt={`${displayName} profile`} className="h-full w-full object-cover" />
                ) : (
                  initials || "H!"
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-2xl font-semibold text-[var(--on-inverse)]">{displayName}</h2>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">{username}</p>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
                  {profile?.bio?.trim() || "Add a short bio so people can get to know you before they connect."}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:min-w-56">
                <div className="rounded-xl border border-white/10 bg-black/10 px-3 py-3">
                  <p className="text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">Profile</p>
                  <p className="mt-1 text-sm font-semibold text-[var(--on-inverse)]">{visibilityLabel}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/10 px-3 py-3">
                  <p className="text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">Discovery</p>
                  <p className="mt-1 text-sm font-semibold text-[var(--on-inverse)]">{discoveryLabel}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 lg:px-8">
        <div className="mb-7 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--brand-primary-dark)]">Profile controls</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--foreground)]">Build your identity</h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
            Your changes are saved atomically, so your profile details and preferences stay consistent together.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
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

          <aside className="space-y-4 lg:sticky lg:top-24">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-sm)]">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">Profile checklist</p>
              <div className="mt-4 space-y-3 text-sm">
                {[
                  [Boolean(profile?.display_name), "Display name"],
                  [Boolean(profile?.bio?.trim()), "Short bio"],
                  [Boolean(profile?.avatar_path), "Profile photo"],
                  [Boolean(userLanguages?.length), "Languages"],
                  [Boolean(userInterests?.length), "Interests"],
                ].map(([complete, label]) => (
                  <div key={String(label)} className="flex items-center gap-3">
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${complete ? "bg-[var(--brand-primary-soft)] text-[var(--brand-primary-dark)]" : "bg-[var(--surface-secondary)] text-[var(--text-secondary)]"}`}>
                      {complete ? "✓" : "–"}
                    </span>
                    <span className={complete ? "text-[var(--foreground)]" : "text-[var(--text-secondary)]"}>{String(label)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-[var(--surface-inverse)] p-5 text-[var(--on-inverse)] shadow-[var(--shadow-sm)]">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-primary)]">Privacy first</p>
              <h3 className="mt-2 text-lg font-semibold">You stay in control.</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                Visibility, discovery, country display, and messaging preferences can be adjusted without changing your account identity.
              </p>
            </div>
          </aside>
        </div>

        <div className="mt-12 border-t border-[var(--border)] pt-10">
          <AccountDeletionPanel />
        </div>
      </section>
    </main>
  );
}
