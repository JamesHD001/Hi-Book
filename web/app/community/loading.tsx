export default function CommunityLoading() {
  return (
    <main className="min-h-screen bg-[#090a0d] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl animate-pulse">
        <div className="h-40 rounded-[2rem] bg-white/[0.06]" />
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <section className="space-y-5">
            <div className="h-32 rounded-3xl bg-white/[0.05]" />
            <div className="h-64 rounded-3xl bg-white/[0.05]" />
            <div className="h-64 rounded-3xl bg-white/[0.05]" />
          </section>
          <aside className="hidden h-72 rounded-3xl bg-white/[0.05] lg:block" />
        </div>
      </div>
      <p className="sr-only" role="status" aria-live="polite">Loading your community.</p>
    </main>
  );
}
