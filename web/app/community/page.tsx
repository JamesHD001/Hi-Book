import Link from "next/link";
import { requireActiveUser } from "@/lib/auth/require-active-user";
import CreatePost from "@/components/community/CreatePost";

export const dynamic = "force-dynamic";

export default async function CommunityPage() {
  const { supabase, user } = await requireActiveUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, username")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <main>
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">Your community</p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Welcome, {profile?.display_name ?? "friend"}.</h1>
              <p className="mt-3 max-w-2xl leading-7 text-slate-600">This is your starting point for discovering people, sharing your perspective, and building genuine connections across the world.</p>
              {profile?.username && <p className="mt-4 text-sm text-slate-500">@{profile.username}</p>}
            </div>
            <CreatePost />
          </div>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-semibold text-slate-950">Keep connecting</h2>
              <div className="mt-4 space-y-2">
                <Link href="/discover" className="block rounded-xl border border-slate-200 p-4 transition hover:border-slate-300 hover:bg-slate-50">
                  <span className="font-semibold">Discover people</span>
                  <span className="mt-1 block text-sm leading-5 text-slate-600">Meet people through languages, interests, and global discovery.</span>
                </Link>
                <Link href="/messages" className="block rounded-xl border border-slate-200 p-4 transition hover:border-slate-300 hover:bg-slate-50">
                  <span className="font-semibold">Messages</span>
                  <span className="mt-1 block text-sm leading-5 text-slate-600">Start private one-to-one conversations.</span>
                </Link>
                <Link href="/notifications" className="block rounded-xl border border-slate-200 p-4 transition hover:border-slate-300 hover:bg-slate-50">
                  <span className="font-semibold">Notifications</span>
                  <span className="mt-1 block text-sm leading-5 text-slate-600">Keep up with activity and account updates.</span>
                </Link>
                <Link href="/profile" className="block rounded-xl border border-slate-200 p-4 transition hover:border-slate-300 hover:bg-slate-50">
                  <span className="font-semibold">Your profile</span>
                  <span className="mt-1 block text-sm leading-5 text-slate-600">Manage what you choose to share.</span>
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
