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
  const date = new Date(value);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
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
    <main className="min-h-[calc(100vh-4rem)] bg-slate-50/70">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:py-10">
        <section className="relative overflow-hidden rounded-[2rem] bg-slate-950 px-6 py-8 text-white shadow-xl sm:px-10 sm:py-10">
          <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-indigo-500/15 blur-3xl" />
          <div className="relative flex flex-col justify-between gap-8 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Private conversations
              </div>
              <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Stay close to the people who matter.</h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">Your conversations stay inside Hi!Book and remain subject to account, block, and message-permission rules.</p>
            </div>
            <Link href="/discover" className="inline-flex shrink-0 items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100">Find people <span className="ml-2">→</span></Link>
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
            <div>
              <h2 className="font-semibold text-slate-950">Inbox</h2>
              <p className="mt-0.5 text-xs text-slate-500">{inbox.length ? `${inbox.length} ${inbox.length === 1 ? "conversation" : "conversations"}` : "Your private space"}</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">Protected</span>
          </div>
          {!inbox.length ? (
            <div className="px-6 py-16 text-center sm:px-10">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-950 text-xl font-black text-white shadow-lg">H!</div>
              <h2 className="mt-5 text-lg font-bold text-slate-950">No conversations yet</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">Discover someone new and start a conversation from their profile when messaging is permitted.</p>
              <Link href="/discover" className="mt-6 inline-flex rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">Explore Discover</Link>
            </div>
          ) : inbox.map((row) => {
            const profile = profiles.get(row.other_user_id);
            const name = profile?.display_name ?? "Conversation";
            const avatar = profile?.avatar_path ? avatarMap.get(profile.avatar_path) ?? null : null;
            const unread = Boolean(row.last_message_created_at && row.last_message_sender_id !== user.id && (!row.last_read_at || new Date(row.last_message_created_at) > new Date(row.last_read_at)));
            const preview = row.last_message_type ? row.last_message_type === "POST_SHARE" ? "Shared a post" : row.last_message_content?.trim() || "Message" : "No messages yet";
            const date = row.last_message_created_at ?? row.conversation_updated_at;
            return (
              <Link key={row.conversation_id} href={`/messages/${row.conversation_id}`} className={`group flex items-center gap-4 border-b border-slate-100 px-5 py-4 transition last:border-b-0 hover:bg-slate-50 sm:px-6 sm:py-5 ${unread ? "bg-blue-50/50" : ""}`}>
                <div className="relative shrink-0">
                  {avatar ? <img src={avatar} alt="" className="h-14 w-14 rounded-2xl object-cover shadow-sm" /> : <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 text-sm font-bold text-white shadow-sm">{initials(name)}</div>}
                  {unread && <span className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-blue-600" aria-label="Unread" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className={`truncate ${unread ? "font-bold text-slate-950" : "font-semibold text-slate-800"}`}>{name}</p>
                    {profile?.username && <span className="hidden truncate text-xs text-slate-400 sm:inline">@{profile.username}</span>}
                  </div>
                  <p className={`mt-1 truncate text-sm ${unread ? "font-medium text-slate-700" : "text-slate-500"}`}>{preview}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <time dateTime={date} className={`text-xs ${unread ? "font-semibold text-blue-600" : "text-slate-400"}`}>{formatDate(date)}</time>
                  <span className="text-lg text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500" aria-hidden="true">›</span>
                </div>
              </Link>
            );
          })}
        </section>
      </div>
    </main>
  );
}
