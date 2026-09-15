import Link from "next/link";

type NetworkUser = {
  userId: string;
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
};

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join("") || "?";
}

export default function NetworkList({
  title,
  description,
  users,
}: {
  title: string;
  description: string;
  users: NetworkUser[];
}) {
  const isFollowers = title.toLowerCase().includes("followers");

  return (
    <main className="min-h-screen bg-slate-50/80 pb-16">
      <section className="relative overflow-hidden border-b border-slate-200 bg-slate-950 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.28),transparent_38%),radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.18),transparent_34%)]" />
        <div className="relative mx-auto max-w-6xl px-4 pb-10 pt-8 sm:px-6 lg:px-8 lg:pb-12">
          <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-blue-200">
                <span className="h-2 w-2 rounded-full bg-blue-400" />
                Your network
              </div>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">{title}</h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-slate-300">{description}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-white/[0.07] p-1.5 backdrop-blur-sm">
              <Link
                href="/network/followers"
                aria-current={isFollowers ? "page" : undefined}
                className={`rounded-xl px-4 py-2.5 text-center text-sm font-semibold transition ${isFollowers ? "bg-white text-slate-950" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}
              >
                Followers
              </Link>
              <Link
                href="/network/following"
                aria-current={!isFollowers ? "page" : undefined}
                className={`rounded-xl px-4 py-2.5 text-center text-sm font-semibold transition ${!isFollowers ? "bg-white text-slate-950" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}
              >
                Following
              </Link>
            </div>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-200">{users.length}</p>
              <p className="mt-1 text-sm text-slate-300">People in this list</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-200">Connection</p>
              <p className="mt-1 text-sm text-slate-300">Build your circle intentionally</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-200">Privacy</p>
              <p className="mt-1 text-sm text-slate-300">Your social graph stays permission-aware</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">Connections</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">{isFollowers ? "People who follow you" : "People you follow"}</h2>
          </div>
          <Link href="/discover" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
            Discover more people →
          </Link>
        </div>

        {users.length === 0 ? (
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="px-6 py-12 text-center sm:px-10">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-100 to-violet-100 text-xl font-extrabold text-slate-700">H!</div>
              <h2 className="mt-5 text-lg font-semibold text-slate-950">Your network is ready for its first connection.</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                Explore profiles, find shared interests, and start building a circle that feels meaningful to you.
              </p>
              <Link href="/discover" className="mt-6 inline-flex rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">
                Explore Discover
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {users.map((person) => (
              <Link
                key={person.userId}
                href={`/u/${person.username}`}
                className="group flex min-w-0 items-center gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg sm:p-6"
              >
                {person.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={person.avatarUrl} alt={`${person.displayName} profile`} className="h-16 w-16 shrink-0 rounded-2xl object-cover shadow-sm" />
                ) : (
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-100 to-violet-100 text-lg font-bold text-slate-700 shadow-sm">
                    {initials(person.displayName)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-semibold tracking-tight text-slate-950 group-hover:text-blue-700">{person.displayName}</p>
                  <p className="mt-0.5 truncate text-sm text-slate-500">@{person.username}</p>
                  <p className="mt-2 line-clamp-2 text-sm leading-5 text-slate-600">{person.bio || "A Hi!Book connection."}</p>
                </div>
                <span className="hidden text-lg text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-600 sm:block" aria-hidden="true">→</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
