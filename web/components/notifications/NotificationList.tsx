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
    case "FOLLOW": return `${actor} started following you.`;
    case "POST_LIKE": return `${actor} liked your post.`;
    case "COMMENT": return `${actor} commented on your post.`;
    case "COMMENT_LIKE": return `${actor} liked your comment.`;
    case "COMMENT_REPLY": return `${actor} replied to your comment.`;
    case "POST_SHARE": return `${actor} shared your post.`;
    case "MENTION": return `${actor} mentioned you.`;
    case "TAG": return `${actor} tagged you in a post.`;
    case "MESSAGE": return `${actor} sent you a message.`;
    default: return item.content ?? "You have a new notification.";
  }
}

function initials(item: NotificationItem) {
  return (item.actorDisplayName ?? "?")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "?";
}

function typeLabel(type: string) {
  switch (type) {
    case "FOLLOW": return "Connection";
    case "MESSAGE": return "Message";
    case "POST_LIKE":
    case "COMMENT_LIKE": return "Like";
    case "COMMENT":
    case "COMMENT_REPLY": return "Conversation";
    default: return "Activity";
  }
}

export default function NotificationList({ initialItems }: { initialItems: NotificationItem[] }) {
  const router = useRouter();
  const supabase = createClient();
  const unreadCount = initialItems.filter((item) => item.status === "UNREAD").length;

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

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div>
          <p className="text-sm font-bold text-slate-900">Recent activity</p>
          <p className="mt-0.5 text-xs text-slate-500">{unreadCount ? `${unreadCount} notification${unreadCount === 1 ? "" : "s"} waiting for you` : "Everything is up to date"}</p>
        </div>
        {unreadCount > 0 && (
          <button type="button" onClick={() => void markAllRead()} className="rounded-full bg-slate-950 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800">
            Mark all as read
          </button>
        )}
      </div>

      {initialItems.length === 0 ? (
        <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-white px-6 py-14 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-lg font-black text-white">H!</div>
          <p className="mt-4 font-bold text-slate-900">You’re all caught up.</p>
          <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-slate-500">When people interact with you, their activity will appear here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {initialItems.map((item) => {
            const profileHref = item.actorUsername ? `/u/${item.actorUsername}` : null;
            const body = notificationText(item);
            return (
              <div
                key={item.id}
                className={`group flex items-start gap-3 rounded-[1.35rem] border p-4 transition sm:gap-4 ${item.status === "UNREAD" ? "border-slate-200 bg-white shadow-md shadow-slate-200/40" : "border-slate-100 bg-white/75 hover:border-slate-200 hover:bg-white"}`}
              >
                {profileHref ? (
                  <Link href={profileHref} className="shrink-0 rounded-2xl focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2">
                    {item.actorAvatarUrl ? (
                      <img src={item.actorAvatarUrl} alt="" className="h-11 w-11 rounded-2xl object-cover" />
                    ) : (
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-sm font-bold text-white">{initials(item)}</div>
                    )}
                  </Link>
                ) : (
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-sm font-bold text-slate-500">!</div>
                )}

                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">{typeLabel(item.type)}</span>
                    {item.status === "UNREAD" && <span className="h-1.5 w-1.5 rounded-full bg-slate-950" aria-label="Unread" />}
                  </div>
                  <p className="mt-2 text-sm font-medium leading-6 text-slate-800">{body}</p>
                  <p className="mt-1 text-xs font-medium text-slate-400">{relativeTime(item.createdAt)}</p>
                </div>

                {item.status === "UNREAD" && (
                  <button type="button" onClick={() => void markRead(item.id)} className="shrink-0 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 opacity-100 transition hover:border-slate-300 hover:bg-slate-50 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100">
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
