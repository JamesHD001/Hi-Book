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
  avatar_url?: string | null;
};

export default async function DiscoverPage() {
  const { supabase } = await requireActiveUser();
  const { data, error } = await supabase.rpc("discover_people", { candidate_limit: 20 });
  const people = (data ?? []) as DiscoveryPerson[];

  const avatarPaths = Array.from(
    new Set(
      people
        .map((person) => person.avatar_path)
        .filter((path): path is string => Boolean(path)),
    ),
  );
  const { data: avatarUrls } = avatarPaths.length
    ? await supabase.storage.from("avatars").createSignedUrls(avatarPaths, 600)
    : { data: [] };
  const avatarMap = new Map((avatarUrls ?? []).map((item) => [item.path, item.signedUrl]));
  const withAvatars = people.map((person) => ({
    ...person,
    avatar_url: person.avatar_path ? avatarMap.get(person.avatar_path) ?? null : null,
  }));

  return (
    <main className="min-h-screen bg-[#f6f2ea] pb-16">
      <section className="relative overflow-hidden border-b border-[#d8d2c6] bg-[#171717] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.28),transparent_38%),radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.18),transparent_34%)]" />
        <div className="relative mx-auto max-w-6xl px-4 pb-12 pt-8 sm:px-6 lg:px-8 lg:pb-14">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#f0b7aa]">
            <span className="h-2 w-2 rounded-full bg-[#c85b45]" aria-hidden="true" />
            Global discovery
          </div>
          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-sm font-medium text-white/65">People beyond your usual circle</p>
              <h1 className="mt-2 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
                Meet someone new.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-white/65 sm:text-lg">
                Find people through shared interests and languages, with discovery shaped by the privacy choices you control.
              </p>
            </div>
            <Link
              href="/profile"
              className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-[#fffdf8]/10 px-4 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-[#fffdf8]/15"
            >
              Manage my discovery profile
            </Link>
          </div>

          <div className="mt-9 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-[#fffdf8]/[0.07] p-4 backdrop-blur-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#f0b7aa]">Shared interests</p>
              <p className="mt-2 text-sm leading-6 text-white/65">Connect around topics you both care about.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#fffdf8]/[0.07] p-4 backdrop-blur-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#f0b7aa]">Shared languages</p>
              <p className="mt-2 text-sm leading-6 text-white/65">Make meaningful conversations easier to start.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#fffdf8]/[0.07] p-4 backdrop-blur-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#f0b7aa]">Privacy aware</p>
              <p className="mt-2 text-sm leading-6 text-white/65">Only eligible profiles appear in discovery.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#c85b45]">Recommended connections</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[#171717]">People you might connect with</h2>
          </div>
          <div className="flex items-center justify-between gap-3 sm:justify-end">
            <p className="text-sm text-[#777168]" aria-live="polite">
              {people.length} profile{people.length === 1 ? "" : "s"} in this discovery set
            </p>
            <Link
              href="/profile"
              className="shrink-0 rounded-xl border border-[#d8d2c6] bg-[#fffdf8] px-3.5 py-2 text-sm font-semibold text-[#68645d]  transition hover:border-[#cfc8bc] hover:bg-[#f6f2ea]"
            >
              Edit profile
            </Link>
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-[#e6c9bf] bg-[#fbebe6] p-5 text-sm text-[#8f3d2d]" role="alert">
            <p className="font-semibold">Discovery is temporarily unavailable.</p>
            <p className="mt-1 text-[#8f4d40]">We couldn’t load recommendations right now. Please refresh the page and try again.</p>
          </div>
        ) : (
          <DiscoverPeopleList people={withAvatars} />
        )}
      </section>
    </main>
  );
}
