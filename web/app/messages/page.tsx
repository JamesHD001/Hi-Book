import Link from "next/link";
import { requireActiveUser } from "@/lib/auth/require-active-user";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const { supabase, user } = await requireActiveUser();
  const { data: memberships } = await supabase.from("conversation_participants").select("conversation_id").eq("user_id", user.id);
  const ids = (memberships ?? []).map((row) => row.conversation_id);
  const { data: conversations } = ids.length
    ? await supabase.from("conversations").select("id, type, updated_at").in("id", ids).eq("type", "DIRECT").order("updated_at", { ascending: false })
    : { data: [] };

  return <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
    <div className="mb-6"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">Messages</p><h1 className="mt-2 text-3xl font-bold">Your conversations</h1><p className="mt-2 text-slate-600">Private conversations are protected by account, block, and message-permission rules.</p></div>
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {!conversations?.length ? <div className="p-8 text-center"><h2 className="font-semibold">No conversations yet</h2><p className="mt-2 text-sm text-slate-600">Start a conversation from a profile when messaging is permitted.</p><Link href="/discover" className="mt-5 inline-block rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white">Discover people</Link></div> : conversations.map((conversation) => <Link key={conversation.id} href={`/messages/${conversation.id}`} className="block border-b border-slate-100 p-5 last:border-b-0 hover:bg-slate-50"><p className="font-semibold">Direct conversation</p><p className="mt-1 text-sm text-slate-500">Open conversation</p></Link>)}
    </section>
  </main>;
}
