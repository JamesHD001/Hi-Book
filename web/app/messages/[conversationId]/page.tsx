import Link from "next/link";
import { notFound } from "next/navigation";
import { requireActiveUser } from "@/lib/auth/require-active-user";
import MessageComposer from "@/components/messaging/MessageComposer";

export const dynamic = "force-dynamic";

type MessageRow = { id: string; sender_id: string; message_type: string; content: string | null; created_at: string };

export default async function ConversationPage({ params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = await params;
  const { supabase, user } = await requireActiveUser();
  const { data: membership } = await supabase.from("conversation_participants").select("conversation_id").eq("conversation_id", conversationId).eq("user_id", user.id).maybeSingle();
  if (!membership) notFound();

  const { data: conversation } = await supabase.from("conversations").select("id, type").eq("id", conversationId).eq("type", "DIRECT").maybeSingle();
  if (!conversation) notFound();

  const { data: messages } = await supabase.from("messages").select("id, sender_id, message_type, content, created_at").eq("conversation_id", conversationId).order("created_at", { ascending: true }).limit(100);
  const rows = (messages ?? []) as MessageRow[];

  return <main className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-3xl flex-col px-4 py-6 sm:px-6">
    <div className="mb-4 flex items-center gap-3"><Link href="/messages" className="rounded-full border border-slate-200 px-3 py-2 text-sm">← Back</Link><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Private message</p><h1 className="font-bold">Conversation</h1></div></div>
    <section className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm">
      <div className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-6">{rows.length ? rows.map((message) => <div key={message.id} className={`flex ${message.sender_id === user.id ? "justify-end" : "justify-start"}`}><div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-6 ${message.sender_id === user.id ? "bg-blue-600 text-white" : "bg-white text-slate-800 shadow-sm"}`}>{message.message_type === "POST_SHARE" ? "Shared a post" : message.content}</div></div>) : <div className="m-auto text-center"><p className="font-semibold">Start the conversation</p><p className="mt-1 text-sm text-slate-500">Messages are delivered only when server-side permission and block checks allow them.</p></div>}</div>
      <MessageComposer conversationId={conversationId} />
    </section>
  </main>;
}
