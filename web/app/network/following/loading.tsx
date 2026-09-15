export default function FollowingLoading() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl animate-pulse">
        <div className="h-44 rounded-[2rem] bg-slate-900/90" />
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="h-24 rounded-3xl bg-white" />
          <div className="h-24 rounded-3xl bg-white" />
          <div className="h-24 rounded-3xl bg-white" />
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="h-36 rounded-3xl border border-slate-200 bg-white" />
          ))}
        </div>
      </div>
      <p className="sr-only" role="status" aria-live="polite">Loading the people you follow.</p>
    </main>
  );
}
