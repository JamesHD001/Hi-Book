"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import MessageComposer from "@/components/messaging/MessageComposer";

type Message = { id: string; sender_id: string; message_type: string; content: string | null; shared_post_id?: string | null; created_at: string };
type Props = { conversationId: string; userId: string; initialMessages: Message[]; otherProfile?: { username: string; display_name: string; avatar_url: string | null } | null };
type RealtimeStatus = "CONNECTING" | "SUBSCRIBED" | "CHANNEL_ERROR" | "TIMED_OUT";

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export default function ConversationView({ conversationId, userId, initialMessages, otherProfile }: Props) {
  const supabase = createClient();
  const [messages, setMessages] = useState(initialMessages);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasOlder, setHasOlder] = useState(initialMessages.length >= 100);
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>("CONNECTING");
  const endRef = useRef<HTMLDivElement>(null);

  const refreshMessages = useCallback(async () => {
    const { data, error } = await supabase
      .from("messages")
      .select("id, sender_id, message_type, content, shared_post_id, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(100);

    if (!error) {
      const refreshed = (data ?? []) as Message[];
      setMessages(refreshed);
      setHasOlder(refreshed.length >= 100);
    }
  }, [conversationId, supabase]);

  useEffect(() => {
    void supabase.rpc("mark_conversation_read", { target_conversation_id: conversationId });
    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` }, (payload) => {
        const message = payload.new as Message;
        setMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message]);
        if (message.sender_id !== userId) void supabase.rpc("mark_conversation_read", { target_conversation_id: conversationId });
      })
      .subscribe((status) => setRealtimeStatus(status as RealtimeStatus));
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
  const realtimeLabel = realtimeStatus === "SUBSCRIBED" ? "Live" : realtimeStatus === "CONNECTING" ? "Connecting" : "Reconnecting";
  const realtimeTone = realtimeStatus === "SUBSCRIBED" ? "bg-emerald-500" : realtimeStatus === "CONNECTING" ? "bg-amber-400" : "bg-red-400";

  return <section aria-label="Conversation" data-realtime-status={realtimeStatus} className="flex min-h-[68vh] flex-1 flex-col overflow-hidden rounded-[1.75rem] border border-slate-200 bg-slate-100 shadow-xl shadow-slate-200/50">
    <header className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
      <Link href={otherProfile ? `/u/${otherProfile.username}` : "/messages"} className="flex min-w-0 items-center gap-3 rounded-2xl p-1 transition hover:bg-slate-50">
        {otherProfile?.avatar_url ? <img src={otherProfile.avatar_url} alt="" className="h-11 w-11 rounded-2xl object-cover shadow-sm" /> : <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 font-bold text-white">{name.charAt(0).toUpperCase()}</div>}
        <div className="min-w-0 text-left"><p className="truncate font-bold text-slate-950">{name}</p>{otherProfile?.username && <p className="truncate text-xs text-slate-500">@{otherProfile.username}</p>}</div>
      </Link>
      <div className="flex shrink-0 items-center gap-2 rounded-full bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-500" title="Realtime message connection status">
        <span className={`h-2 w-2 rounded-full ${realtimeTone}`} aria-hidden="true" />
        <span className="hidden sm:inline">{realtimeLabel}</span>
      </div>
    </header>

    <div className="flex-1 space-y-3 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
      {hasOlder && <button type="button" onClick={() => void loadOlder()} disabled={loadingOlder} className="mx-auto flex rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">{loadingOlder ? "Loading messages…" : "Load older messages"}</button>}
      {messages.length ? messages.map((message) => {
        const own = message.sender_id === userId;
        return <div key={message.id} className={`flex ${own ? "justify-end" : "justify-start"}`}>
          <div className={`max-w-[82%] sm:max-w-[70%] ${own ? "items-end" : "items-start"}`}>
            <div className={`rounded-2xl px-4 py-3 text-sm leading-6 ${own ? "rounded-br-md bg-slate-950 text-white shadow-md shadow-slate-300/40" : "rounded-bl-md border border-slate-200 bg-white text-slate-800 shadow-sm"}`}>
              {message.message_type === "POST_SHARE" && message.shared_post_id ? <Link href={`/community?post=${encodeURIComponent(message.shared_post_id)}`} className="font-semibold underline underline-offset-2">Shared a post · View post</Link> : message.content}
            </div>
            <p className={`mt-1 px-1 text-[10px] text-slate-400 ${own ? "text-right" : "text-left"}`}>{formatTime(message.created_at)}</p>
          </div>
        </div>;
      }) : <div className="m-auto max-w-sm text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-lg font-black text-white">H!</div>
        <p className="mt-4 font-bold text-slate-900">Start the conversation</p>
        <p className="mt-1 text-sm leading-6 text-slate-500">Say hello. Messages are delivered only when server-side permission and block checks allow them.</p>
      </div>}
      <div ref={endRef} />
    </div>

    <MessageComposer
      conversationId={conversationId}
      onSent={(message) => setMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message])}
      onSendError={() => { void refreshMessages(); }}
    />
  </section>;
}
