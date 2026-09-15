import Link from "next/link";

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#090a0d] px-6 py-12 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(49,94,251,0.16),transparent_32%),radial-gradient(circle_at_82%_82%,rgba(139,92,246,0.12),transparent_30%)]" aria-hidden="true" />
      <section className="relative w-full max-w-xl rounded-[2rem] border border-white/10 bg-white/[0.045] p-8 text-center shadow-2xl shadow-black/25 backdrop-blur-xl sm:p-10">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-white/10 bg-white/[0.06] text-xl font-bold text-white/80" aria-hidden="true">
          404
        </div>
        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.24em] text-white/40">Hi!Book</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">This page took a wrong turn.</h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-white/55">
          The page you are looking for does not exist, may have moved, or is not available from this account.
        </p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/"
            className="inline-flex min-h-12 items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-slate-100 focus-visible:outline-white"
          >
            Return home
          </Link>
          <Link
            href="/community"
            className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/[0.1] focus-visible:outline-white"
          >
            Open community
          </Link>
        </div>
        <p className="mt-5 text-xs text-white/30">Hi!Book · Connect beyond distance</p>
      </section>
    </main>
  );
}
