import Link from "next/link";
import { requireActiveUser } from "@/lib/auth/require-active-user";
import CreatePost from "@/components/community/CreatePost";
import PostFeed from "@/components/feed/PostFeed";

export const dynamic = "force-dynamic";

export default async function CommunityPage() {
  const { supabase, user } = await requireActiveUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, username")
    .eq("user_id", user.id)
    .maybeSingle();

  const displayName = profile?.display_name ?? "friend";

  return (
    <main>
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 overflow-hidden rounded-[28px] border border-[#dce3ff] bg-[linear-gradient(135deg,#ffffff_0%,#f5f7ff_58%,#f8f3ff_100%)] p-6 shadow-sm sm:p-8 lg:p-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#dce3ff] bg-white/80 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-[#3150c9]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#12b76a]" aria-hidden="true" />
                Your community
              </div>
              <h1 className="mt-5 text-3xl font-extrabold tracking-[-0.045em] text-slate-950 sm:text-4xl lg:text-5xl">
                Welcome, {displayName}.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                This is your space to share what matters, discover different perspectives, and build genuine connections across the world.
              </p>
              {profile?.username && (
                <p className="mt-5 inline-flex rounded-full bg-white/80 px-3 py-1.5 text-sm font-semibold text-slate-600 shadow-sm">
                  @{profile.username}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:w-[360px]">
              <Link href="/discover" className="rounded-2xl border border-white/90 bg-white/75 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <span className="text-xl" aria-hidden="true">◎</span>
                <span className="mt-2 block text-sm font-bold text-slate-950">Discover</span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">Meet new people</span>
              </Link>
              <Link href="/messages" className="rounded-2xl border border-white/90 bg-white/75 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <span className="text-xl" aria-hidden="true">◇</span>
                <span className="mt-2 block text-sm font-bold text-slate-950">Messages</span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">Keep conversations going</span>
              </Link>
              <Link href="/profile" className="rounded-2xl border border-white/90 bg-white/75 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md col-span-2 sm:col-span-1">
                <span className="text-xl" aria-hidden="true">◌</span>
                <span className="mt-2 block text-sm font-bold text-slate-950">Profile</span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">Shape your presence</span>
              </Link>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 space-y-6">
            <CreatePost />
            <PostFeed />
          </div>

          <aside className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#315efb]">Stay connected</p>
                  <h2 className="mt-2 text-lg font-extrabold tracking-tight text-slate-950">Your Hi!Book shortcuts</h2>
                </div>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#eef2ff] font-bold text-[#315efb]" aria-hidden="true">→</span>
              </div>

              <div className="mt-5 space-y-2">
                <Link href="/discover" className="group flex items-center gap-3 rounded-2xl border border-transparent p-3 transition hover:border-slate-200 hover:bg-slate-50">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#eef2ff] font-bold text-[#315efb]" aria-hidden="true">◎</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-slate-950">Discover people</span>
                    <span className="mt-0.5 block text-xs leading-5 text-slate-500">Explore languages, interests, and perspectives.</span>
                  </span>
                  <span className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500" aria-hidden="true">→</span>
                </Link>
                <Link href="/messages" className="group flex items-center gap-3 rounded-2xl border border-transparent p-3 transition hover:border-slate-200 hover:bg-slate-50">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#f4ebff] font-bold text-[#8b5cf6]" aria-hidden="true">◇</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-slate-950">Private messages</span>
                    <span className="mt-0.5 block text-xs leading-5 text-slate-500">Have one-to-one conversations with your connections.</span>
                  </span>
                  <span className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500" aria-hidden="true">→</span>
                </Link>
                <Link href="/notifications" className="group flex items-center gap-3 rounded-2xl border border-transparent p-3 transition hover:border-slate-200 hover:bg-slate-50">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#ecfdf3] font-bold text-[#12b76a]" aria-hidden="true">!</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-slate-950">Notifications</span>
                    <span className="mt-0.5 block text-xs leading-5 text-slate-500">Keep up with activity and account updates.</span>
                  </span>
                  <span className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500" aria-hidden="true">→</span>
                </Link>
                <Link href="/profile" className="group flex items-center gap-3 rounded-2xl border border-transparent p-3 transition hover:border-slate-200 hover:bg-slate-50">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 font-bold text-slate-600" aria-hidden="true">◌</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-slate-950">Your profile</span>
                    <span className="mt-0.5 block text-xs leading-5 text-slate-500">Manage what you choose to share.</span>
                  </span>
                  <span className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500" aria-hidden="true">→</span>
                </Link>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-950 p-6 text-white shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-indigo-200">A better way to connect</p>
              <h2 className="mt-3 text-xl font-extrabold tracking-tight">Different backgrounds. Shared humanity.</h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">Hi!Book is designed to help people discover one another without asking everyone to be the same.</p>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
