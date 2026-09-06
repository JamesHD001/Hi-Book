import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white">
      <section className="mx-auto flex min-h-[80vh] max-w-6xl flex-col justify-center px-6 py-20 lg:px-8">
        <div className="max-w-3xl">
          <p className="mb-5 text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
            Hi!Book 2.0
          </p>
          <h1 className="text-5xl font-bold tracking-tight text-gray-950 sm:text-6xl">
            Connect beyond distance.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-gray-600">
            Hi!Book is a global social network built to make it easier for
            people who are different to understand, communicate with, and
            connect across countries, cultures, languages, and backgrounds.
          </p>
          <div className="mt-9 flex flex-wrap gap-4">
            <Link
              href="/signup"
              className="rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Create your account
            </Link>
            <Link
              href="/login"
              className="rounded-full border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-900 transition hover:bg-gray-50"
            >
              Sign in
            </Link>
          </div>
        </div>

        <div className="mt-20 grid gap-6 border-t border-gray-200 pt-10 sm:grid-cols-3">
          <div>
            <h2 className="font-semibold text-gray-950">Discover globally</h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Explore people, languages, interests, and perspectives from
              around the world.
            </p>
          </div>
          <div>
            <h2 className="font-semibold text-gray-950">Connect safely</h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Privacy, blocking, reporting, and server-enforced permissions
              are built into the foundation.
            </p>
          </div>
          <div>
            <h2 className="font-semibold text-gray-950">Be yourself</h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Share your interests and perspective without needing everyone to
              be the same.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
