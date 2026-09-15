export default function MessagesLoading() {
  return (
    <main className="min-h-[calc(100vh-4rem)] bg-slate-50/70 px-4 py-6 sm:px-6 lg:py-10">
      <div className="mx-auto max-w-5xl animate-pulse">
        <div className="h-48 rounded-[2rem] bg-slate-950/10" />
        <section className="mt-6 overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
            <div className="h-5 w-24 rounded-full bg-slate-200" />
            <div className="mt-2 h-3 w-44 rounded-full bg-slate-100" />
          </div>
          <div className="divide-y divide-slate-100">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="flex items-center gap-4 px-5 py-4 sm:px-6 sm:py-5">
                <div className="h-14 w-14 shrink-0 rounded-2xl bg-slate-200" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-4 w-36 rounded-full bg-slate-200" />
                  <div className="h-3 w-56 max-w-full rounded-full bg-slate-100" />
                </div>
                <div className="h-3 w-12 rounded-full bg-slate-100" />
              </div>
            ))}
          </div>
        </section>
      </div>
      <p className="sr-only" role="status" aria-live="polite">Loading your messages.</p>
    </main>
  );
}
