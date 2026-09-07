import Link from "next/link";
import { requireActiveUser } from "@/lib/auth/require-active-user";

export const dynamic = "force-dynamic";

type Conversation = { id: string; type: "DIRECT" | "GROUP"; updated_at: string };
type Participant = { conversation_id: string; user_id: string; last_read_at: string | null };
type Profile = { user_id: string; username: string; display_name: string; avatar_path: string | null };
type LastMessage = { conversation_id: string; sender_id: string; message_type: string; content: string | null; created_at: string };
function initials(name: string) { return name.trim().split(/\s+/).slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join("") || "?"; }
function formatDate(value: string) { return new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short" }); }

export default async function MessagesPage() {
  const { supabase, user } = await requireActiveUser();
  const { data: memberships } = await supabase.from("conversation_participants").select("conversation_id, user_id, last_read_at").eq("user_id", user.id);
  const participantRows = (memberships ?? []) as Participant[];
  const ids = participantRows.map((row) => row.conversation_id);
  const { data: conversationData } = ids.length ? await supabase.from("conversations").select("id, type, updated_at").in("id", ids).eq("type", "DIRECT").order("updated_at", { ascending: false }) : { data: [] };
  const conversations = (conversationData ?? []) as Conversation[];
  const conversationIds = conversations.map((conversation) => conversation.id);
  const { data: allParticipants } = conversationIds.length ? await supabase.from("conversation_participants").select("conversation_id, user_id").in("conversation_id", conversationIds) : { data: [] };
  const rows = (allParticipants ?? []) as { conversation_id: string; user_id: string }[];
  const otherUserIds = rows.filter((row) => row.user_id !== user.id).map((row) => row.user_id);
  const { data: profileData } = otherUserIds.length ? await supabase.from("profiles").select("user_id, username, display_name, avatar_path").in("user_id", otherUserIds) : { data: [] };
  const profiles = new Map(((profileData ?? []) as Profile[]).map((profile) => [profile.user_id, profile]));
  const otherByConversation = new Map<string, string>();
  for (const row of rows) if (row.user_id !== user.id) otherByConversation.set(row.conversation_id, row.user_id);
  const { data: lastMessageData } = conversationIds.length ? await supabase.from("messages").select("conversation_id, sender_id, message_type, content, created_at").in("conversation_id", conversationIds).order("created_at", { ascending: false }).limit(200) : { data: [] };
  const latest = new Map<string, LastMessage>();
  for (const row of (lastMessageData ?? []) as LastMessage[]) if (!latest.has(row.conversation_id)) latest.set(row.conversation_id, row);
  const readByConversation = new Map(participantRows.map((row) => [row.conversation_id, row.last_read_at]));
  const items = await Promise.all(conversations.map(async (conversation) => {
    const otherUserId = otherByConversation.get(conversation.id); const profile = otherUserId ? profiles.get(otherUserId) : undefined;
    const avatar = profile?.avatar_path ? (await supabase.storage.from("avatars").createSignedUrl(profile.avatar_path, 600)).data?.signedUrl ?? null : null;
    const last = latest.get(conversation.id); const lastRead = readByConversation.get(conversation.id); const unread = Boolean(last && last.sender_id !== user.id && (!lastRead || new Date(last.created_at) > new Date(lastRead)));
    const preview = last ? last.message_type === "POST_SHARE" ? "Shared a post" : last.content?.trim() || "Message" : "No messages yet";
    return { conversation, profile, avatar, unread, preview, last };
  }));
  return <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6"><div className="mb-6"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">Messages</p><h1 className="mt-2 text-3xl font-bold">Your conversations</h1><p className="mt-2 text-slate-600">Private conversations are protected by account, block, and message-permission rules.</p></div><section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">{!items.length ? <div className="p-8 text-center"><h2 className="font-semibold">No conversations yet</h2><p className="mt-2 text-sm text-slate-600">Start a conversation from a profile when messaging is permitted.</p><Link href="/discover" className="mt-5 inline-block rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white">Discover people</Link></div> : items.map(({ conversation, profile, avatar, unread, preview, last }) => { const name = profile?.display_name ?? "Conversation"; return <Link key={conversation.id} href={`/messages/${conversation.id}`} className={`flex items-center gap-4 border-b border-slate-100 p-5 last:border-b-0 hover:bg-slate-50 ${unread ? "bg-blue-50/50" : ""}`}>{avatar ? <img src={avatar} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover" /> : <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-200 font-bold text-slate-600">{initials(name)}</div>}<div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className={`truncate font-semibold ${unread ? "text-slate-950" : "text-slate-800"}`}>{name}</p>{unread && <span className="h-2 w-2 shrink-0 rounded-full bg-blue-600" aria-label="Unread" />}</div><p className={`truncate text-sm ${unread ? "font-medium text-slate-700" : "text-slate-500"}`}>{preview}</p></div><time dateTime={last?.created_at ?? conversation.updated_at} className="shrink-0 text-xs text-slate-400">{formatDate(last?.created_at ?? conversation.updated_at)}</time></Link>; })}</section></main>;
}
