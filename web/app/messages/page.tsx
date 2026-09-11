import Link from "next/link";
import { requireActiveUser } from "@/lib/auth/require-active-user";

export const dynamic = "force-dynamic";

type InboxRow = {
  conversation_id: string;
  conversation_type: "DIRECT" | "GROUP";
  conversation_updated_at: string;
  other_user_id: string;
  last_read_at: string | null;
  last_message_id: string | null;
  last_message_sender_id: string | null;
  last_message_type: string | null;
  last_message_content: string | null;
  last_message_created_at: string | null;
};
type Profile = { user_id: string; username: string; display_name: string; avatar_path: string | null };

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join("") || "?";
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export default async function MessagesPage() {
  const { supabase, user } = await requireActiveUser();
  const { data: inboxData, error: inboxError } = await supabase.rpc("get_message_inbox");
  if (inboxError) throw new Error("Unable to load conversations");

  const inbox = (inboxData ?? []) as InboxRow[];
  const otherUserIds = Array.from(new Set(inbox.map((row) => row.other_user_id)));
  const { data: profileData } = otherUserIds.length
    ? await supabase.from("profiles").select("user_id, username, display_name, avatar_path").in("user_id", otherUserIds)
    : { data: [] };
  const profiles = new Map(((profileData ?? []) as Profile[]).map((profile) => [profile.user_id, profile]));

  const avatarPaths = Array.from(new Set(
    otherUserIds
      .map((id) => profiles.get(id)?.avatar_path)
      .filter((path): path is string => Boolean(path)),
  ));
  const { data: avatarUrls } = avatarPaths.length
    ? await supabase.storage.from("avatars").createSignedUrls(avatarPaths, 600)
    : { data: [] };
  const avatarMap = new Map((avatarUrls ?? []).map((item) => [item.path, item.signedUrl]));

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">Messages</p>
        <h1 className="mt-2 text-3xl font-bold">Your conversations</h1>
        <p className="mt-2 text-slate-600">Private conversations are protected by account, block, and message-permission rules.</p>
      </div>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {!inbox.length ? (
          <div className="p-8 text-center">
            <h2 className="font-semibold">No conversations yet</h2>
            <p className="mt-2 text-sm text-slate-600">Start a conversation from a profile when messaging is permitted.</p>
            <Link href="/discover" className="mt-5 inline-block rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white">Discover people</Link>
          </div>
        ) : inbox.map((row) => {
          const profile = profiles.get(row.other_user_id);
          const name = profile?.display_name ?? "Conversation";
          const avatar = profile?.avatar_path ? avatarMap.get(profile.avatar_path) ?? null : null;
          const unread = Boolean(
            row.last_message_created_at
              && row.last_message_sender_id !== user.id
              && (!row.last_read_at || new Date(row.last_message_created_at) > new Date(row.last_read_at)),
          );
          const preview = row.last_message_type
            ? row.last_message_type === "POST_SHARE" ? "Shared a post" : row.last_message_content?.trim() || "Message"
            : "No messages yet";
          const date = row.last_message_created_at ?? row.conversation_updated_at;

          return (
            <Link key={row.conversation_id} href={`/messages/${row.conversation_id}`} className={`flex items-center gap-4 border-b border-slate-100 p-5 last:border-b-0 hover:bg-slate-50 ${unread ? "bg-blue-50/50" : ""}`}>
              {avatar ? <img src={avatar} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover" /> : <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-200 font-bold text-slate-600">{initials(name)}</div>}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className={`truncate font-semibold ${unread ? "text-slate-950" : "text-slate-800"}`}>{name}</p>
                  {unread && <span className="h-2 w-2 shrink-0 rounded-full bg-blue-600" aria-label="Unread" />}
                </div>
                <p className={`truncate text-sm ${unread ? "font-medium text-slate-700" : "text-slate-500"}`}>{preview}</p>
              </div>
              <time dateTime={date} className="shrink-0 text-xs text-slate-400">{formatDate(date)}</time>
            </Link>
          );
        })}
      </section>
    </main>
  );
}
