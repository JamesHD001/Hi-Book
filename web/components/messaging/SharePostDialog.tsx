"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Conversation = { id: string; other: { username: string; display_name: string; avatar_path: string | null } | null };

export default function SharePostDialog({ postId, onClose }: { postId: string; onClose: () => void }) {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const supabase = createClient();
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData.user) throw new Error("Authentication required.");
        const { data: memberships, error: membershipError } = await supabase
          .from("conversation_participants")
          .select("conversation_id")
          .eq("user_id", userData.user.id);
        if (membershipError) throw membershipError;
        const ids = (memberships ?? []).map((row) => row.conversation_id as string);
        if (!ids.length) { if (!cancelled) setConversations([]); return; }
        const { data: rows, error: conversationError } = await supabase
          .from("conversations")
          .select("id, updated_at, conversation_participants(user_id)")
          .in("id", ids)
          .eq("type", "DIRECT")
          .order("updated_at", { ascending: false });
        if (conversationError) throw conversationError;
        const others = (rows ?? []).map((row) => {
          const participants = (row.conversation_participants ?? []) as { user_id: string }[];
          const otherId = participants.find((participant) => participant.user_id !== userData.user.id)?.user_id;
          return { id: row.id as string, otherId };
        }).filter((row): row is { id: string; otherId: string } => Boolean(row.otherId));
        if (!others.length) { if (!cancelled) setConversations([]); return; }
        const { data: profiles, error: profileError } = await supabase
          .from("profiles")
          .select("user_id, username, display_name, avatar_path")
          .in("user_id", others.map((row) => row.otherId));
        if (profileError) throw profileError;
        const byId = new Map((profiles ?? []).map((profile) => [profile.user_id as string, profile]));
        const result = others.map((row) => ({ id: row.id, other: byId.has(row.otherId) ? byId.get(row.otherId) as Conversation["other"] : null }));
        if (!cancelled) setConversations(result.filter((row) => row.other));
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Could not load conversations.");
      } finally { if (!cancelled) setLoading(false); }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  async function share(conversationId: string) {
    if (sendingId) return;
    setSendingId(conversationId); setError(null);
    try {
      const supabase = createClient();
      const { data, error: rpcError } = await supabase.rpc("share_post_to_conversation", {
        target_post_id: postId,
        target_conversation_id: conversationId,
      });
      if (rpcError) throw rpcError;
      router.push(`/messages/${data as string}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not share this post.");
      setSendingId(null);
    }
  }

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label="Share post in a conversation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl">
      <header className="flex items-center justify-between border-b border-slate-200 p-5"><div><h2 className="font-bold text-slate-950">Send to a conversation</h2><p className="mt-1 text-sm text-slate-500">Choose an existing private conversation.</p></div><button type="button" onClick={onClose} className="rounded-full px-3 py-1 text-xl text-slate-500 hover:bg-slate-100" aria-label="Close">×</button></header>
      <div className="max-h-[60vh] overflow-y-auto p-3">
        {error && <p className="mb-2 rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
        {loading && <p className="p-5 text-center text-sm text-slate-500">Loading conversations…</p>}
        {!loading && !conversations.length && <div className="p-5 text-center"><p className="font-semibold">No conversations yet</p><p className="mt-1 text-sm text-slate-500">Start a private conversation from someone&apos;s profile first.</p></div>}
        {!loading && conversations.map((conversation) => <button key={conversation.id} type="button" onClick={() => void share(conversation.id)} disabled={Boolean(sendingId)} className="flex w-full items-center gap-3 rounded-xl p-3 text-left hover:bg-slate-50 disabled:opacity-60"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 font-bold text-slate-500">{conversation.other?.display_name.charAt(0).toUpperCase()}</div><div className="min-w-0"><p className="truncate font-semibold text-slate-950">{conversation.other?.display_name}</p><p className="truncate text-sm text-slate-500">@{conversation.other?.username}</p></div>{sendingId === conversation.id && <span className="ml-auto text-xs text-slate-500">Sending…</span>}</button>)}
      </div>
    </div>
  </div>;
}
