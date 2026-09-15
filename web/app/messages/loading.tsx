export default function MessagesLoading() {
  return (
    <main className="min-h-screen bg-[#090a0d] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl animate-pulse">
        <div className="h-44 rounded-[2rem] bg-white/[0.06]" />
        <section className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04]">
          <div className="border-b border-white/10 px-5 py-5 sm:px-6">
            <div className="h-5 w-32 rounded-full bg-white/10" />
            <div className="mt-3 h-3 w-64 rounded-full bg-white/[0.06]" />
          </div>
          <div className="divide-y divide-white/5">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="flex items-center gap-4 px-5 py-5 sm:px-6">
                <div className="h-12 w-12 shrink-0 rounded-2xl bg-white/10" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-4 w-36 rounded-full bg-white/10" />
                  <div className="h-3 w-56 max-w-full rounded-full bg-white/[0.06]" />
                </div>
                <div className="h-3 w-12 rounded-full bg-white/[0.06]" />
              </div>
            ))}
          </div>
        </section>
      </div>
      <p className="sr-only" role="status" aria-live="polite">Loading your messages.</p>
    </main>
  );
}
