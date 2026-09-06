import Link from "next/link";
import { requireActiveUser } from "@/lib/auth/require-active-user";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const { supabase, user } = await requireActiveUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, username, bio, avatar_path")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <main>
      <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">Your profile</p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight">{profile?.display_name ?? "Your profile"}</h1>
              {profile?.username && <p className="mt-1 text-slate-500">@{profile.username}</p>}
            </div>
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xl font-bold text-slate-500" aria-hidden="true">
              {(profile?.display_name?.[0] ?? "H").toUpperCase()}
            </div>
          </div>
          <p className="mt-6 leading-7 text-slate-600">{profile?.bio || "Add a short introduction when profile editing is connected."}</p>
          <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5">
            <h2 className="font-semibold">Profile completion</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Avatar, bio, languages, interests, and privacy controls will be added in the profile-completion step.</p>
          </div>
          <Link href="/community" className="mt-8 inline-flex rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50">
            Back to community
          </Link>
        </div>
      </section>
    </main>
  );
}
