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
    <main className="min-h-[calc(100vh-4rem)] bg-[var(--background)]">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:py-10">
        <section className="relative overflow-hidden rounded-[2rem] bg-[var(--surface-inverse)] px-6 py-8 text-[var(--on-inverse)] shadow-[var(--shadow-lg)] sm:px-10 sm:py-10">
          <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[var(--brand-primary)]/20 blur-3xl" />
          <div className="absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-[var(--brand-primary-dark)]/15 blur-3xl" />
          <div className="relative flex flex-col justify-between gap-8 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" /> Private conversations
              </div>
              <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Stay close to the people who matter.</h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--text-secondary)] sm:text-base">Your conversations stay inside Hi!Book and remain subject to account, block, and message-permission rules.</p>
            </div>
            <Link href="/discover" className="inline-flex shrink-0 items-center justify-center rounded-full bg-[var(--surface)] px-5 py-3 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface-secondary)]">Find people <span className="ml-2">→</span></Link>
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)]">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4 sm:px-6">
            <div>
              <h2 className="font-semibold text-[var(--foreground)]">Inbox</h2>
              <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{inbox.length ? `${inbox.length} ${inbox.length === 1 ? "conversation" : "conversations"}` : "Your private space"}</p>
            </div>
            <span className="rounded-full bg-[var(--surface-secondary)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)]">Protected</span>
          </div>
          {!inbox.length ? (
            <div className="px-6 py-16 text-center sm:px-10">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--surface-inverse)] text-xl font-black text-[var(--on-inverse)] shadow-lg">H!</div>
              <h2 className="mt-5 text-lg font-bold text-[var(--foreground)]">No conversations yet</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--text-secondary)]">Discover someone new and start a conversation from their profile when messaging is permitted.</p>
              <Link href="/discover" className="mt-6 inline-flex rounded-full bg-[var(--surface-inverse)] px-5 py-2.5 text-sm font-semibold text-[var(--on-inverse)] transition hover:brightness-110">Explore Discover</Link>
            </div>
          ) : inbox.map((row) => {
            const profile = profiles.get(row.other_user_id);
            const name = profile?.display_name ?? "Conversation";
            const avatar = profile?.avatar_path ? avatarMap.get(profile.avatar_path) ?? null : null;
            const unread = Boolean(row.last_message_created_at && row.last_message_sender_id !== user.id && (!row.last_read_at || new Date(row.last_message_created_at) > new Date(row.last_read_at)));
            const preview = row.last_message_type ? row.last_message_type === "POST_SHARE" ? "Shared a post" : row.last_message_content?.trim() || "Message" : "No messages yet";
            const date = row.last_message_created_at ?? row.conversation_updated_at;
            return (
              <Link key={row.conversation_id} href={`/messages/${row.conversation_id}`} className={`group flex items-center gap-4 border-b border-[var(--border)] px-5 py-4 transition last:border-b-0 hover:bg-[var(--surface-secondary)] sm:px-6 sm:py-5 ${unread ? "bg-[var(--brand-primary-soft)]/80" : ""}`}>
                <div className="relative shrink-0">
                  {avatar ? <img src={avatar} alt="" className="h-14 w-14 rounded-2xl object-cover shadow-sm" /> : <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--surface-inverse),var(--brand-primary-dark))] text-sm font-bold text-[var(--on-inverse)] shadow-sm">{initials(name)}</div>}
                  {unread && <span className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full border-2 border-[var(--surface)] bg-[var(--brand-primary-dark)]" aria-label="Unread" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className={`truncate ${unread ? "font-bold text-[var(--foreground)]" : "font-semibold text-[var(--foreground)]"}`}>{name}</p>
                    {profile?.username && <span className="hidden truncate text-xs text-[var(--text-secondary)] sm:inline">@{profile.username}</span>}
                  </div>
                  <p className={`mt-1 truncate text-sm ${unread ? "font-medium text-[var(--foreground)]" : "text-[var(--text-secondary)]"}`}>{preview}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <time dateTime={date} className={`text-xs ${unread ? "font-semibold text-[var(--brand-primary-dark)]" : "text-[var(--text-secondary)]"}`}>{formatDate(date)}</time>
                  <span className="text-lg text-[var(--subtle)] transition group-hover:translate-x-0.5 group-hover:text-[var(--text-secondary)]" aria-hidden="true">›</span>
                </div>
              </Link>
            );
          })}
        </section>
      </div>
    </main>
  );
}
