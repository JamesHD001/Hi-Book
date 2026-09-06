"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export type NotificationItem = {
  id: string;
  actorUsername: string | null;
  actorDisplayName: string | null;
  actorAvatarUrl: string | null;
  type: string;
  entityType: string | null;
  entityId: string | null;
  content: string | null;
  status: "UNREAD" | "READ";
  createdAt: string;
};

function relativeTime(value: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function notificationText(item: NotificationItem) {
  const actor = item.actorDisplayName ?? "Someone";
  switch (item.type) {
    case "FOLLOW":
      return `${actor} started following you.`;
    case "POST_LIKE":
      return `${actor} liked your post.`;
    case "COMMENT":
      return `${actor} commented on your post.`;
    case "COMMENT_LIKE":
      return `${actor} liked your comment.`;
    case "COMMENT_REPLY":
      return `${actor} replied to your comment.`;
    case "POST_SHARE":
      return `${actor} shared your post.`;
    case "MENTION":
      return `${actor} mentioned you.`;
    case "TAG":
      return `${actor} tagged you in a post.`;
    case "MESSAGE":
      return `${actor} sent you a message.`;
    default:
      return item.content ?? "You have a new notification.";
  }
}

export default function NotificationList({ initialItems }: { initialItems: NotificationItem[] }) {
  const router = useRouter();
  const supabase = createClient();

  async function markRead(id: string) {
    const { error } = await supabase
      .from("notifications")
      .update({ status: "READ", read_at: new Date().toISOString() })
      .eq("id", id)
      .eq("status", "UNREAD");

    if (!error) router.refresh();
  }

  async function markAllRead() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { error } = await supabase
      .from("notifications")
      .update({ status: "READ", read_at: new Date().toISOString() })
      .eq("recipient_id", userData.user.id)
      .eq("status", "UNREAD");

    if (!error) router.refresh();
  }

  const unreadCount = initialItems.filter((item) => item.status === "UNREAD").length;

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-4">
        <p className="text-sm text-slate-500">{unreadCount} unread</p>
        {unreadCount > 0 && (
          <button type="button" onClick={markAllRead} className="text-sm font-semibold text-blue-600 hover:text-blue-700">
            Mark all as read
          </button>
        )}
      </div>

      {initialItems.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
          You’re all caught up.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {initialItems.map((item) => {
            const profileHref = item.actorUsername ? `/u/${item.actorUsername}` : null;
            const body = notificationText(item);
            return (
              <div
                key={item.id}
                className={`flex items-center gap-4 border-b border-slate-100 p-4 last:border-b-0 ${item.status === "UNREAD" ? "bg-blue-50/50" : ""}`}
              >
                {profileHref ? (
                  <Link href={profileHref} className="shrink-0">
                    {item.actorAvatarUrl ? (
                      <img src={item.actorAvatarUrl} alt="" className="h-11 w-11 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-200 font-semibold text-slate-600">
                        {(item.actorDisplayName ?? "?").charAt(0).toUpperCase()}
                      </div>
                    )}
                  </Link>
                ) : (
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-200 font-semibold text-slate-600">!</div>
                )}

                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-800">{body}</p>
                  <p className="mt-1 text-xs text-slate-400">{relativeTime(item.createdAt)}</p>
                </div>

                {item.status === "UNREAD" && (
                  <button type="button" onClick={() => markRead(item.id)} className="shrink-0 text-xs font-semibold text-blue-600">
                    Read
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
