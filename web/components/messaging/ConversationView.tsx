"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import MessageComposer from "@/components/messaging/MessageComposer";

type Message = { id: string; sender_id: string; message_type: string; content: string | null; shared_post_id?: string | null; created_at: string };
type Props = { conversationId: string; userId: string; initialMessages: Message[]; otherProfile?: { username: string; display_name: string; avatar_url: string | null } | null };

export default function ConversationView({ conversationId, userId, initialMessages, otherProfile }: Props) {
  const supabase = createClient();
  const [messages, setMessages] = useState(initialMessages);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasOlder, setHasOlder] = useState(initialMessages.length >= 100);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void supabase.rpc("mark_conversation_read", { target_conversation_id: conversationId });
    const channel = supabase.channel(`conversation:${conversationId}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` }, (payload) => {
      const message = payload.new as Message;
      setMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message]);
      if (message.sender_id !== userId) void supabase.rpc("mark_conversation_read", { target_conversation_id: conversationId });
    }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [conversationId, supabase, userId]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  async function loadOlder() {
    const oldest = messages[0];
    if (!oldest || loadingOlder) return;
    setLoadingOlder(true);
    const { data, error } = await supabase.from("messages").select("id, sender_id, message_type, content, shared_post_id, created_at").eq("conversation_id", conversationId).lt("created_at", oldest.created_at).order("created_at", { ascending: false }).limit(100);
    if (!error) {
      const older = ((data ?? []) as Message[]).reverse();
      setMessages((current) => [...older, ...current]);
      setHasOlder(older.length >= 100);
    }
    setLoadingOlder(false);
  }

  const name = otherProfile?.display_name ?? "Conversation";
  return <section className="flex min-h-[70vh] flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm">
    <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
      <Link href={otherProfile ? `/u/${otherProfile.username}` : "/messages"} className="flex min-w-0 items-center gap-3 rounded-xl p-1 hover:bg-slate-50">
        {otherProfile?.avatar_url ? <img src={otherProfile.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" /> : <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-200 font-bold text-slate-600">{name.charAt(0).toUpperCase()}</div>}
        <div className="min-w-0 text-left"><p className="truncate font-semibold text-slate-950">{name}</p>{otherProfile?.username && <p className="truncate text-xs text-slate-500">@{otherProfile.username}</p>}</div>
      </Link>
    </header>
    <div className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-6">
      {hasOlder && <button type="button" onClick={() => void loadOlder()} disabled={loadingOlder} className="mx-auto block rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 disabled:opacity-50">{loadingOlder ? "Loading…" : "Load older messages"}</button>}
      {messages.length ? messages.map((message) => <div key={message.id} className={`flex ${message.sender_id === userId ? "justify-end" : "justify-start"}`}><div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-6 ${message.sender_id === userId ? "bg-blue-600 text-white" : "bg-white text-slate-800 shadow-sm"}`}>{message.message_type === "POST_SHARE" && message.shared_post_id ? <Link href={`/community?post=${encodeURIComponent(message.shared_post_id)}`} className="font-semibold underline">Shared a post · View post</Link> : message.content}</div></div>) : <div className="m-auto text-center"><p className="font-semibold">Start the conversation</p><p className="mt-1 text-sm text-slate-500">Messages are delivered only when server-side permission and block checks allow them.</p></div>}
      <div ref={endRef} />
    </div>
    <MessageComposer conversationId={conversationId} />
  </section>;
}
