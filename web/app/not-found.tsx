import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12">
      <section className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">Hi!Book</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">Page not found</h1>
        <p className="mt-3 leading-7 text-slate-600">
          The page you requested does not exist or is no longer available.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
        >
          Return home
        </Link>
      </section>
    </main>
  );
}
