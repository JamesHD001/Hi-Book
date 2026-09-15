export default function SettingsLoading() {
  const sections = ["h-28", "h-24", "h-44", "h-24", "h-20"];

  return (
    <main className="min-h-screen bg-slate-50/80 pb-20">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="h-4 w-24 animate-pulse rounded-full bg-slate-200" />
          <div className="mt-3 h-10 w-56 animate-pulse rounded-xl bg-slate-200" />
          <div className="mt-3 h-5 max-w-2xl animate-pulse rounded-lg bg-slate-100" />
        </div>
      </section>
      <section className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        {sections.map((height) => (
          <section key={height} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="h-6 w-40 animate-pulse rounded-xl bg-slate-200" />
            <div className="mt-6 h-10 animate-pulse rounded-xl bg-slate-100" />
            <div className="mt-3 h-10 animate-pulse rounded-xl bg-slate-100" />
            <div className={`mt-3 ${height} animate-pulse rounded-xl bg-slate-50`} />
          </section>
        ))}
      </section>
      <p className="sr-only" role="status" aria-live="polite">Loading account settings.</p>
    </main>
  );
}
