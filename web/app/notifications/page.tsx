import NotificationList, { type NotificationItem } from "@/components/notifications/NotificationList";
import { requireActiveUser } from "@/lib/auth/require-active-user";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const { supabase, user } = await requireActiveUser();

  const { data: notifications, error } = await supabase
    .from("notifications")
    .select("id, actor_id, type, entity_type, entity_id, content, status, created_at")
    .eq("recipient_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const actorIds = Array.from(new Set((notifications ?? []).map((item) => item.actor_id).filter(Boolean)));
  const { data: profiles } = actorIds.length
    ? await supabase
        .from("profiles")
        .select("user_id, username, display_name, avatar_path")
        .in("user_id", actorIds)
    : { data: [] };

  const profileMap = new Map((profiles ?? []).map((profile) => [profile.user_id, profile]));

  const items: NotificationItem[] = await Promise.all(
    (notifications ?? []).map(async (notification) => {
      const profile = notification.actor_id ? profileMap.get(notification.actor_id) : null;
      const avatarUrl = profile?.avatar_path
        ? (await supabase.storage.from("avatars").createSignedUrl(profile.avatar_path, 600)).data?.signedUrl ?? null
        : null;

      return {
        id: notification.id,
        actorUsername: profile?.username ?? null,
        actorDisplayName: profile?.display_name ?? null,
        actorAvatarUrl: avatarUrl,
        type: notification.type,
        entityType: notification.entity_type,
        entityId: notification.entity_id,
        content: notification.content,
        status: notification.status,
        createdAt: notification.created_at,
      };
    }),
  );

  return (
    <main>
      <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">Activity</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Notifications</h1>
          <p className="mt-2 text-slate-600">Stay up to date with activity that matters to you.</p>
        </div>
        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
            We couldn’t load your notifications right now. Please try again.
          </div>
        ) : (
          <NotificationList initialItems={items} />
        )}
      </section>
    </main>
  );
}
