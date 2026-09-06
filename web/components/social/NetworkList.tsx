import Link from "next/link";

type NetworkUser = {
  userId: string;
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
};

export default function NetworkList({
  title,
  description,
  users,
}: {
  title: string;
  description: string;
  users: NetworkUser[];
}) {
  return (
    <main>
      <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-7">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">Social graph</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">{title}</h1>
          <p className="mt-2 text-slate-600">{description}</p>
        </div>

        {users.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            Nothing to show yet.
          </div>
        ) : (
          <div className="space-y-3">
            {users.map((person) => (
              <Link
                key={person.userId}
                href={`/u/${person.username}`}
                className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm"
              >
                {person.avatarUrl ? (
                  <img
                    src={person.avatarUrl}
                    alt=""
                    className="h-12 w-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-200 font-bold text-slate-600">
                    {person.displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-950">{person.displayName}</p>
                  <p className="truncate text-sm text-slate-500">@{person.username}</p>
                  {person.bio && <p className="mt-1 line-clamp-1 text-sm text-slate-600">{person.bio}</p>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
