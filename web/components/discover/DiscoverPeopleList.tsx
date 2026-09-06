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
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <p className="font-semibold text-slate-900">No new people to show right now.</p>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Try adding more languages or interests to your profile, or broaden your discovery preferences.
        </p>
        <Link
          href="/profile"
          className="mt-5 inline-flex rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Update my profile
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {people.map((person) => {
        const shared = person.shared_interest_count + person.shared_language_count;
        return (
          <article key={person.user_id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-4">
              <Link href={`/u/${person.username}`} className="shrink-0">
                {person.avatar_url ? (
                  <img src={person.avatar_url} alt="" className="h-14 w-14 rounded-full object-cover" />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-200 font-bold text-slate-600">
                    {initials(person.display_name) || "?"}
                  </div>
                )}
              </Link>
              <div className="min-w-0 flex-1">
                <Link href={`/u/${person.username}`} className="block truncate font-semibold text-slate-950 hover:underline">
                  {person.display_name}
                </Link>
                <p className="truncate text-sm text-slate-500">@{person.username}</p>
                {person.country_code && (
                  <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-400">{person.country_code}</p>
                )}
              </div>
            </div>

            {person.bio && <p className="mt-4 line-clamp-2 text-sm leading-6 text-slate-600">{person.bio}</p>}

            <div className="mt-4 flex min-h-5 items-center gap-2 text-xs text-slate-500">
              {shared > 0 ? (
                <>
                  {person.shared_interest_count > 0 && <span>{person.shared_interest_count} shared interest{person.shared_interest_count === 1 ? "" : "s"}</span>}
                  {person.shared_interest_count > 0 && person.shared_language_count > 0 && <span>•</span>}
                  {person.shared_language_count > 0 && <span>{person.shared_language_count} shared language{person.shared_language_count === 1 ? "" : "s"}</span>}
                </>
              ) : (
                <span>Explore someone new</span>
              )}
            </div>

            <div className="mt-5 flex items-center justify-between gap-3">
              <Link href={`/u/${person.username}`} className="text-sm font-semibold text-blue-600 hover:text-blue-700">
                View profile
              </Link>
              <FollowButton targetUserId={person.user_id} initialFollowing={false} />
            </div>
          </article>
        );
      })}
    </div>
  );
}
