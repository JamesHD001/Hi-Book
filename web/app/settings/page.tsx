import { requireActiveUser } from "@/lib/auth/require-active-user";
import SettingsPanel from "@/components/settings/SettingsPanel";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { supabase, user } = await requireActiveUser();

  const [{ data: preferences }, { data: notifications }] = await Promise.all([
    supabase
      .from("user_preferences")
      .select("language_code, autoplay_media, reduced_motion")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("notification_preferences")
      .select(
        "follows_enabled, likes_enabled, comments_enabled, messages_enabled, mentions_enabled, system_enabled, moderation_enabled, push_enabled, email_enabled",
      )
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  return (
    <main className="min-h-screen bg-[#f6f2ea] pb-20">
      <section className="border-b border-[#d8d2c6] bg-[#fffdf8]">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#c85b45]">Account</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#171717] sm:text-4xl">Settings</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#68645d] sm:text-base">
            Manage your Hi!Book preferences, notifications, account access, and privacy controls from one place.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <SettingsPanel
          userId={user.id}
          email={user.email ?? ""}
          initialPreferences={{
            languageCode: preferences?.language_code ?? "en",
            autoplayMedia: preferences?.autoplay_media ?? true,
            reducedMotion: preferences?.reduced_motion ?? false,
          }}
          initialNotifications={{
            follows: notifications?.follows_enabled ?? true,
            likes: notifications?.likes_enabled ?? true,
            comments: notifications?.comments_enabled ?? true,
            messages: notifications?.messages_enabled ?? true,
            mentions: notifications?.mentions_enabled ?? true,
            system: notifications?.system_enabled ?? true,
            moderation: notifications?.moderation_enabled ?? true,
            push: notifications?.push_enabled ?? true,
            email: notifications?.email_enabled ?? true,
          }}
        />
      </section>
    </main>
  );
}
