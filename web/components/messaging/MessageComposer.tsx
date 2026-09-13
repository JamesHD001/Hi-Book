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
      setError(rpcError.message);
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

  return <form onSubmit={submit} className="border-t border-slate-200 bg-white p-4">
    {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
    <div className="flex gap-2">
      <input value={content} onChange={(e) => setContent(e.target.value)} maxLength={4000} placeholder="Write a message…" className="min-w-0 flex-1 rounded-full border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500" />
      <button disabled={!content.trim() || sending} className="rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{sending ? "Sending…" : "Send"}</button>
    </div>
  </form>;
}
