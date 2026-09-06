import Link from "next/link";
import { requireActiveUser } from "@/lib/auth/require-active-user";

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
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">
            Your community
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Welcome, {profile?.display_name ?? "friend"}.
          </h1>
          <p className="mt-3 max-w-2xl leading-7 text-slate-600">
            This is your starting point for discovering people, sharing your
            perspective, and building genuine connections across the world.
          </p>
          {profile?.username && (
            <p className="mt-4 text-sm text-slate-500">@{profile.username}</p>
          )}

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Link href="/discover" className="rounded-xl border border-slate-200 p-5 transition hover:border-slate-300 hover:bg-slate-50">
              <h2 className="font-semibold">Discover people</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">Meet people through languages, interests, and global discovery.</p>
            </Link>
            <Link href="/messages" className="rounded-xl border border-slate-200 p-5 transition hover:border-slate-300 hover:bg-slate-50">
              <h2 className="font-semibold">Messages</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">Start private one-to-one conversations when you are ready to connect.</p>
            </Link>
            <Link href="/notifications" className="rounded-xl border border-slate-200 p-5 transition hover:border-slate-300 hover:bg-slate-50">
              <h2 className="font-semibold">Notifications</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">Keep up with activity and important account updates.</p>
            </Link>
            <Link href="/profile" className="rounded-xl border border-slate-200 p-5 transition hover:border-slate-300 hover:bg-slate-50">
              <h2 className="font-semibold">Your profile</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">Manage the information and interests you choose to share.</p>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
