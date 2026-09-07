import Link from "next/link";
import { notFound } from "next/navigation";
import { requireActiveUser } from "@/lib/auth/require-active-user";
import ConversationView from "@/components/messaging/ConversationView";

export const dynamic = "force-dynamic";

type MessageRow = { id: string; sender_id: string; message_type: string; content: string | null; shared_post_id: string | null; created_at: string };
type Participant = { user_id: string };
type Profile = { username: string; display_name: string; avatar_path: string | null };

export default async function ConversationPage({ params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = await params;
  const { supabase, user } = await requireActiveUser();
  const { data: membership } = await supabase.from("conversation_participants").select("conversation_id").eq("conversation_id", conversationId).eq("user_id", user.id).maybeSingle();
  if (!membership) notFound();
  const { data: conversation } = await supabase.from("conversations").select("id, type").eq("id", conversationId).eq("type", "DIRECT").maybeSingle();
  if (!conversation) notFound();
  const { data: participantData } = await supabase.from("conversation_participants").select("user_id").eq("conversation_id", conversationId).neq("user_id", user.id).limit(1);
  const otherUserId = ((participantData ?? []) as Participant[])[0]?.user_id;
  let otherProfile: { username: string; display_name: string; avatar_url: string | null } | null = null;
  if (otherUserId) {
    const { data: profileData } = await supabase.from("profiles").select("username, display_name, avatar_path").eq("user_id", otherUserId).maybeSingle();
    const profile = profileData as Profile | null;
    const avatar_url = profile?.avatar_path ? (await supabase.storage.from("avatars").createSignedUrl(profile.avatar_path, 600)).data?.signedUrl ?? null : null;
    if (profile) otherProfile = { ...profile, avatar_url };
  }
  const { data: messages } = await supabase.from("messages").select("id, sender_id, message_type, content, shared_post_id, created_at").eq("conversation_id", conversationId).order("created_at", { ascending: true }).limit(100);
  return <main className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-3xl flex-col px-4 py-6 sm:px-6">
    <div className="mb-4 flex items-center gap-3"><Link href="/messages" className="rounded-full border border-slate-200 px-3 py-2 text-sm">← Back</Link><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Private message</p><h1 className="font-bold">Conversation</h1></div></div>
    <ConversationView conversationId={conversationId} userId={user.id} initialMessages={(messages ?? []) as MessageRow[]} otherProfile={otherProfile} />
  </main>;
}
