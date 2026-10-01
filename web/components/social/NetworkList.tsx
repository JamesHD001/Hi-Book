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
    <main className="min-h-screen bg-(--background) pb-16">
      <section className="border-b border-(--border) bg-(--surface-inverse) text-white">
        <div className="mx-auto max-w-6xl px-4 pb-9 pt-7 sm:px-6 lg:px-8 lg:pb-11">
          <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-(--brand-accent)">
                <span className="h-2 w-2 rounded-full bg-(--brand-primary)" />
                Your network
              </div>
              <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">{title}</h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-white/75">{description}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 rounded-md border border-white/10 bg-white/6 p-1.5">
              <Link href="/network/followers" aria-current={isFollowers ? "page" : undefined} className={`rounded-md px-4 py-2.5 text-center text-sm font-bold transition ${isFollowers ? "bg-(--brand-accent) text-(--foreground)" : "text-white/75 hover:bg-white/10 hover:text-white"}`}>Followers</Link>
              <Link href="/network/following" aria-current={!isFollowers ? "page" : undefined} className={`rounded-md px-4 py-2.5 text-center text-sm font-bold transition ${!isFollowers ? "bg-(--brand-accent) text-(--foreground)" : "text-white/75 hover:bg-white/10 hover:text-white"}`}>Following</Link>
            </div>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <div className="rounded-md border border-white/15 bg-white/5 p-4"><p className="text-xs font-bold uppercase tracking-[0.16em] text-(--brand-accent)">{users.length}</p><p className="mt-1 text-sm text-white/75">People in this list</p></div>
            <div className="rounded-md border border-white/15 bg-white/5 p-4"><p className="text-xs font-bold uppercase tracking-[0.16em] text-(--brand-accent)">Connection</p><p className="mt-1 text-sm text-white/75">Build your circle intentionally</p></div>
            <div className="rounded-md border border-white/15 bg-white/5 p-4"><p className="text-xs font-bold uppercase tracking-[0.16em] text-(--brand-accent)">Privacy</p><p className="mt-1 text-sm text-white/75">Your social graph stays permission-aware</p></div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-(--brand-primary-dark)">Connections</p><h2 className="mt-1 text-2xl font-bold tracking-tight text-(--foreground)">{isFollowers ? "People who follow you" : "People you follow"}</h2></div>
          <Link href="/discover" className="text-sm font-bold text-(--brand-primary-dark) hover:text-(--brand-primary)">Discover more people →</Link>
        </div>

        {users.length === 0 ? (
          <div className="overflow-hidden rounded-lg border border-(--border) bg-(--surface) shadow-sm">
            <div className="px-6 py-12 text-center sm:px-10">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-lg bg-(--brand-primary-soft) text-xl font-extrabold text-(--brand-primary-dark)">H!</div>
              <h2 className="mt-5 text-lg font-bold text-(--foreground)">Your network is ready for its first connection.</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-(--text-secondary)">Explore profiles, find shared interests, and start building a circle that feels meaningful to you.</p>
              <Link href="/discover" className="mt-6 inline-flex rounded-md bg-(--brand-primary) px-5 py-2.5 text-sm font-bold text-white transition hover:bg-(--brand-primary-dark) focus:outline-none focus:ring-2 focus:ring-(--brand-primary) focus:ring-offset-2">Explore Discover</Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {users.map((person) => (
              <Link key={person.userId} href={`/u/${person.username}`} className="group flex min-w-0 items-center gap-4 rounded-lg border border-(--border) bg-(--surface) p-5 transition duration-200 hover:-translate-y-0.5 hover:border-(--brand-primary) hover:shadow-sm sm:p-6">
                {person.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={person.avatarUrl} alt={`${person.displayName} profile`} className="h-16 w-16 shrink-0 rounded-2xl object-cover" />
                ) : (
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-[linear-gradient(135deg,var(--brand-primary),var(--brand-primary-dark))] text-lg font-bold text-white">{initials(person.displayName)}</div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-bold tracking-tight text-(--foreground) group-hover:text-(--brand-primary-dark)">{person.displayName}</p>
                  <p className="mt-0.5 truncate text-sm text-(--muted)">@{person.username}</p>
                  <p className="mt-2 line-clamp-2 text-sm leading-5 text-(--text-secondary)">{person.bio || "A Hi!Book connection."}</p>
                </div>
                <span className="hidden text-lg text-(--subtle) transition group-hover:translate-x-0.5 group-hover:text-(--brand-primary-dark) sm:block" aria-hidden="true">→</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
