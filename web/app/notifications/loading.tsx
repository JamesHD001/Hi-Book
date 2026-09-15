export default function NotificationsLoading() {
  return (
    <main className="min-h-screen bg-[#090a0d] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl animate-pulse">
        <div className="h-44 rounded-[2rem] bg-white/[0.06]" />
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="h-24 rounded-3xl bg-white/[0.05]" />
          <div className="h-24 rounded-3xl bg-white/[0.05]" />
          <div className="h-24 rounded-3xl bg-white/[0.05]" />
        </div>
        <section className="mt-6 space-y-3">
          {[1, 2, 3, 4, 5].map((item) => (
            <div key={item} className="flex items-center gap-4 rounded-3xl border border-white/10 bg-white/[0.04] p-5">
              <div className="h-11 w-11 shrink-0 rounded-2xl bg-white/10" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-4 w-48 max-w-full rounded-full bg-white/10" />
                <div className="h-3 w-72 max-w-full rounded-full bg-white/[0.06]" />
              </div>
            </div>
          ))}
        </section>
      </div>
      <p className="sr-only" role="status" aria-live="polite">Loading your activity.</p>
    </main>
  );
}
