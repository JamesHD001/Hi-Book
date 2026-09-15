export default function NotificationsLoading() {
  return (
    <main className="min-h-[calc(100vh-4rem)] bg-slate-50/70 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <div className="mx-auto max-w-5xl animate-pulse">
        <section className="h-52 rounded-[2rem] bg-slate-200 sm:h-56" aria-hidden="true" />

        <div className="mt-6 grid gap-4 sm:grid-cols-3" aria-hidden="true">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-24 rounded-2xl border border-slate-200 bg-white" />
          ))}
        </div>

        <section className="mt-6 overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white" aria-hidden="true">
          <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
            <div className="h-4 w-32 rounded-full bg-slate-200" />
            <div className="mt-2 h-3 w-72 max-w-full rounded-full bg-slate-100" />
          </div>
          <div className="space-y-2 p-4 sm:p-6">
            {[1, 2, 3, 4, 5].map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-[1.35rem] border border-slate-100 p-4 sm:gap-4">
                <div className="h-11 w-11 shrink-0 rounded-2xl bg-slate-200" />
                <div className="min-w-0 flex-1 space-y-2 pt-1">
                  <div className="h-3 w-24 rounded-full bg-slate-200" />
                  <div className="h-4 w-64 max-w-full rounded-full bg-slate-100" />
                  <div className="h-3 w-10 rounded-full bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
      <p className="sr-only" role="status" aria-live="polite">Loading your activity.</p>
    </main>
  );
}
