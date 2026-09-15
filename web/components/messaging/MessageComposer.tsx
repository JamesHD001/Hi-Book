"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type SentMessage = {
  id: string;
  content: string;
  sender_id: string;
  message_type: "TEXT";
  shared_post_id: null;
  created_at: string;
};

export default function MessageComposer({ conversationId, onSent }: { conversationId: string; onSent?: (message: SentMessage) => void }) {
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const text = content.trim();
    if (!text || sending) return;
    setSending(true); setError(null);
    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc("send_message", {
      p_conversation_id: conversationId, p_message_type: "TEXT", p_content: text,
      p_shared_post_id: null, p_reply_to_message_id: null, p_media: [],
    });
    if (rpcError) {
      setError(`Messaging unavailable: ${rpcError.message}`);
    } else {
      setContent("");
      const messageId = data as string;
      const { data: message, error: messageError } = await supabase
        .from("messages")
        .select("id, sender_id, message_type, content, shared_post_id, created_at")
        .eq("id", messageId)
        .maybeSingle();
      if (messageError || !message) {
        setError(messageError?.message ?? "Message was sent but could not be loaded.");
      } else {
        onSent?.({
          id: message.id,
          content: message.content ?? text,
          sender_id: message.sender_id,
          message_type: "TEXT",
          shared_post_id: null,
          created_at: message.created_at,
        });
      }
    }
    setSending(false);
  }

  return <form onSubmit={submit} className="border-t border-slate-200 bg-white p-3 sm:p-4">
    {error && <div role="alert" className="mb-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
    <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1.5 shadow-sm transition focus-within:border-slate-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-slate-100">
      <label htmlFor="message-content" className="sr-only">Write a message</label>
      <textarea id="message-content" value={content} onChange={(e) => setContent(e.target.value)} maxLength={4000} rows={1} placeholder="Write a message…" className="max-h-32 min-h-11 min-w-0 flex-1 resize-none bg-transparent px-3 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400" />
      <button type="submit" disabled={!content.trim() || sending} className="shrink-0 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40">{sending ? "Sending…" : "Send"}</button>
    </div>
    <div className="flex items-center justify-between px-2 pt-2 text-[11px] text-slate-400"><span>Private &amp; protected</span><span>{content.length}/4000</span></div>
  </form>;
}
