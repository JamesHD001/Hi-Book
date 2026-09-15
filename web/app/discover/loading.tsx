export default function DiscoverLoading() {
  return (
    <main className="min-h-screen bg-[#090a0d] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl animate-pulse">
        <div className="h-52 rounded-[2rem] bg-white/[0.06]" />
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="h-28 rounded-3xl bg-white/[0.05]" />
          <div className="h-28 rounded-3xl bg-white/[0.05]" />
          <div className="h-28 rounded-3xl bg-white/[0.05]" />
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <div className="h-52 rounded-3xl bg-white/[0.05]" />
          <div className="h-52 rounded-3xl bg-white/[0.05]" />
          <div className="h-52 rounded-3xl bg-white/[0.05]" />
          <div className="h-52 rounded-3xl bg-white/[0.05]" />
        </div>
      </div>
      <p className="sr-only" role="status" aria-live="polite">Loading people you may want to meet.</p>
    </main>
  );
}
