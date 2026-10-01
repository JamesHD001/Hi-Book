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
    ? await supabase.from("profiles").select("user_id, username, display_name, avatar_path").in("user_id", actorIds)
    : { data: [] };

  const profileMap = new Map((profiles ?? []).map((profile) => [profile.user_id, profile]));
  const avatarPaths = Array.from(new Set((profiles ?? []).map((profile) => profile.avatar_path).filter((path): path is string => Boolean(path))));
  const { data: avatarUrls } = avatarPaths.length
    ? await supabase.storage.from("avatars").createSignedUrls(avatarPaths, 600)
    : { data: [] };
  const avatarMap = new Map((avatarUrls ?? []).map((item) => [item.path, item.signedUrl]));

  const items: NotificationItem[] = (notifications ?? []).map((notification) => {
    const profile = notification.actor_id ? profileMap.get(notification.actor_id) : null;
    return {
      id: notification.id,
      actorUsername: profile?.username ?? null,
      actorDisplayName: profile?.display_name ?? null,
      actorAvatarUrl: profile?.avatar_path ? avatarMap.get(profile.avatar_path) ?? null : null,
      type: notification.type,
      entityType: notification.entity_type,
      entityId: notification.entity_id,
      content: notification.content,
      status: notification.status,
      createdAt: notification.created_at,
    };
  });

  const unreadCount = items.filter((item) => item.status === "UNREAD").length;

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[var(--background)]">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:py-10">
        <section className="relative overflow-hidden rounded-[2rem] bg-[var(--surface-inverse)] px-6 py-8 text-[var(--on-inverse)] shadow-[var(--shadow-lg)] sm:px-10 sm:py-10">
          <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[var(--brand-primary)]/20 blur-3xl" />
          <div className="absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-[var(--brand-primary-dark)]/15 blur-3xl" />
          <div className="relative flex flex-col justify-between gap-8 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand-primary)]" /> Your activity
              </div>
              <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Stay in the loop.</h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--text-secondary)] sm:text-base">Keep up with the people, conversations, and moments that matter to you.</p>
            </div>
            <div className="shrink-0 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-sm">
              <p className="text-2xl font-bold text-[var(--on-inverse)]">{unreadCount}</p>
              <p className="mt-0.5 text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-secondary)]">Unread</p>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-sm)]">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">Inbox</p>
            <p className="mt-2 text-2xl font-bold text-[var(--foreground)]">{items.length}</p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">Recent activity items</p>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-sm)]">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">Unread</p>
            <p className="mt-2 text-2xl font-bold text-[var(--foreground)]">{unreadCount}</p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">Waiting for your attention</p>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-sm)]">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">Privacy</p>
            <p className="mt-2 text-2xl font-bold text-[var(--foreground)]">Protected</p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">Personal activity only</p>
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)]">
          <div className="border-b border-[var(--border)] px-5 py-4 sm:px-6">
            <h2 className="font-semibold text-[var(--foreground)]">Recent activity</h2>
            <p className="mt-0.5 text-xs text-[var(--text-secondary)]">Follow, post, comment, message, and other updates.</p>
          </div>
          {error ? (
            <div className="m-5 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 sm:m-6">
              We couldn’t load your notifications right now. Please try again.
            </div>
          ) : (
            <div className="p-4 sm:p-6">
              <NotificationList initialItems={items} />
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
