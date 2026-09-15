export default function ProfileLoading() {
  return (
    <main className="min-h-screen bg-slate-50/80 pb-16">
      <section className="border-b border-slate-200 bg-slate-950 text-white">
        <div className="mx-auto max-w-6xl px-4 pb-12 pt-8 sm:px-6 lg:px-8 lg:pb-14">
          <div className="h-4 w-40 animate-pulse rounded-full bg-white/10" />
          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <div className="h-4 w-48 animate-pulse rounded-full bg-white/10" />
              <div className="mt-3 h-12 max-w-xl animate-pulse rounded-2xl bg-white/10 sm:h-14" />
              <div className="mt-4 h-12 max-w-2xl animate-pulse rounded-2xl bg-white/[0.07]" />
            </div>
            <div className="h-20 w-full animate-pulse rounded-2xl bg-white/[0.07] lg:w-56" />
          </div>
          <div className="mt-10 h-32 animate-pulse rounded-3xl border border-white/10 bg-white/[0.07] sm:h-28" />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 lg:px-8">
        <div className="mb-7 space-y-2">
          <div className="h-4 w-32 animate-pulse rounded-full bg-slate-200" />
          <div className="h-8 w-56 animate-pulse rounded-xl bg-slate-200" />
        </div>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="h-6 w-40 animate-pulse rounded-xl bg-slate-200" />
            <div className="mt-7 space-y-5">
              <div className="h-28 w-28 animate-pulse rounded-full bg-slate-100" />
              <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
              <div className="h-28 animate-pulse rounded-xl bg-slate-100" />
              <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
            </div>
          </section>
          <aside className="hidden space-y-4 lg:block">
            <div className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-white" />
            <div className="h-40 animate-pulse rounded-2xl bg-slate-950/10" />
          </aside>
        </div>
      </section>
      <p className="sr-only" role="status" aria-live="polite">Loading your profile.</p>
    </main>
  );
}
