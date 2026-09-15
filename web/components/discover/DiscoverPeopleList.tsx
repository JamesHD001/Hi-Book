"use client";

import Link from "next/link";
import FollowButton from "@/components/social/FollowButton";

type Person = {
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

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export default function DiscoverPeopleList({ people }: { people: Person[] }) {
  if (people.length === 0) {
    return (
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-slate-950 px-6 py-10 text-center text-white sm:px-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-2xl font-bold ring-1 ring-white/10">H!</div>
          <p className="mt-5 text-lg font-semibold">Your next connection has not appeared yet.</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-300">
            Add more languages or interests to your profile, or broaden your discovery preferences to create more opportunities.
          </p>
          <Link
            href="/profile"
            className="mt-6 inline-flex rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
          >
            Improve my discovery profile
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-5 md:grid-cols-2">
      {people.map((person) => {
        const shared = person.shared_interest_count + person.shared_language_count;
        return (
          <article
            key={person.user_id}
            className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg sm:p-6"
          >
            <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-blue-50 blur-2xl transition group-hover:bg-violet-50" />
            <div className="relative flex items-start gap-4">
              <Link href={`/u/${person.username}`} className="shrink-0 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                {person.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={person.avatar_url} alt={`${person.display_name} profile`} className="h-16 w-16 rounded-2xl object-cover shadow-sm" />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-100 to-violet-100 text-lg font-bold text-slate-700 shadow-sm">
                    {initials(person.display_name) || "?"}
                  </div>
                )}
              </Link>
              <div className="min-w-0 flex-1 pt-0.5">
                <Link
                  href={`/u/${person.username}`}
                  className="block truncate text-lg font-semibold tracking-tight text-slate-950 hover:text-blue-700"
                >
                  {person.display_name}
                </Link>
                <p className="mt-0.5 truncate text-sm text-slate-500">@{person.username}</p>
                {person.country_code && (
                  <span className="mt-2 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    {person.country_code}
                  </span>
                )}
              </div>
            </div>

            <p className="relative mt-5 min-h-12 line-clamp-2 text-sm leading-6 text-slate-600">
              {person.bio || "Open to a new connection on Hi!Book."}
            </p>

            <div className="relative mt-5 flex min-h-8 flex-wrap items-center gap-2">
              {person.shared_interest_count > 0 && (
                <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                  {person.shared_interest_count} shared interest{person.shared_interest_count === 1 ? "" : "s"}
                </span>
              )}
              {person.shared_language_count > 0 && (
                <span className="rounded-full border border-violet-100 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700">
                  {person.shared_language_count} shared language{person.shared_language_count === 1 ? "" : "s"}
                </span>
              )}
              {shared === 0 && <span className="text-xs font-medium text-slate-400">A fresh connection</span>}
            </div>

            <div className="relative mt-6 flex items-center justify-between gap-3 border-t border-slate-100 pt-5">
              <Link href={`/u/${person.username}`} className="text-sm font-semibold text-slate-700 transition hover:text-blue-700">
                View profile <span aria-hidden="true">→</span>
              </Link>
              <FollowButton targetUserId={person.user_id} initialFollowing={false} />
            </div>
          </article>
        );
      })}
    </div>
  );
}
