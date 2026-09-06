import Link from "next/link";
import DiscoverPeopleList from "@/components/discover/DiscoverPeopleList";
import { requireActiveUser } from "@/lib/auth/require-active-user";

export const dynamic = "force-dynamic";

type DiscoveryPerson = {
  user_id: string;
  username: string;
  display_name: string;
  bio: string | null;
  avatar_path: string | null;
  country_code: string | null;
  shared_interest_count: number;
  shared_language_count: number;
};

export default async function DiscoverPage() {
  const { supabase } = await requireActiveUser();

  const { data, error } = await supabase.rpc("discover_people", { candidate_limit: 20 });
  const people = (data ?? []) as DiscoveryPerson[];

  const withAvatars = await Promise.all(
    people.map(async (person) => {
      if (!person.avatar_path) return { ...person, avatar_url: null };
      const { data: signed } = await supabase.storage.from("avatars").createSignedUrl(person.avatar_path, 600);
      return { ...person, avatar_url: signed?.signedUrl ?? null };
    }),
  );

  return (
    <main>
      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">Global discovery</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Meet someone new.</h1>
            <p className="mt-3 max-w-2xl leading-7 text-slate-600">
              Discover people beyond your usual circle through shared interests, languages, and a willingness to explore.
            </p>
          </div>
          <Link href="/profile" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
            Manage discovery profile
          </Link>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
            We couldn’t load discovery right now. Please try again.
          </div>
        ) : (
          <DiscoverPeopleList people={withAvatars} />
        )}
      </section>
    </main>
  );
}
