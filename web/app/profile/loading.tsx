export default function ProfileLoading() {
  return (
    <main className="min-h-screen bg-[#090a0d] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl animate-pulse">
        <div className="h-56 rounded-[2rem] bg-white/[0.06]" />
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 sm:p-8">
            <div className="h-5 w-40 rounded-full bg-white/10" />
            <div className="mt-7 space-y-5">
              <div className="h-12 rounded-2xl bg-white/[0.06]" />
              <div className="h-12 rounded-2xl bg-white/[0.06]" />
              <div className="h-28 rounded-2xl bg-white/[0.06]" />
              <div className="h-12 rounded-2xl bg-white/[0.06]" />
            </div>
          </section>
          <aside className="hidden h-72 rounded-3xl bg-white/[0.05] lg:block" />
        </div>
      </div>
      <p className="sr-only" role="status" aria-live="polite">Loading your profile.</p>
    </main>
  );
}
