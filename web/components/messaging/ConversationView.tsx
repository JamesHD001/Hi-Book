"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import MessageComposer from "@/components/messaging/MessageComposer";

type Message = { id: string; sender_id: string; message_type: string; content: string | null; created_at: string };

export default function ConversationView({ conversationId, userId, initialMessages }: { conversationId: string; userId: string; initialMessages: Message[] }) {
  const [messages, setMessages] = useState(initialMessages);
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`conversation:${conversationId}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` }, (payload) => {
      const message = payload.new as Message;
      setMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message]);
    }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [conversationId]);

  return <section className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm">
    <div className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-6">
      {messages.length ? messages.map((message) => <div key={message.id} className={`flex ${message.sender_id === userId ? "justify-end" : "justify-start"}`}><div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-6 ${message.sender_id === userId ? "bg-blue-600 text-white" : "bg-white text-slate-800 shadow-sm"}`}>{message.message_type === "POST_SHARE" ? "Shared a post" : message.content}</div></div>) : <div className="m-auto text-center"><p className="font-semibold">Start the conversation</p><p className="mt-1 text-sm text-slate-500">Messages are delivered only when server-side permission and block checks allow them.</p></div>}
    </div>
    <MessageComposer conversationId={conversationId} />
  </section>;
}
