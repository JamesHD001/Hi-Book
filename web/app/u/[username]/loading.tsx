export default function PublicProfileLoading() {
  return (
    <main className="min-h-screen bg-[#090a0d] px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl animate-pulse">
        <div className="h-72 rounded-[2rem] bg-white/[0.06]" />
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <section className="h-64 rounded-3xl border border-white/10 bg-white/[0.04]" />
          <aside className="h-48 rounded-3xl border border-white/10 bg-white/[0.04]" />
        </div>
      </div>
      <p className="sr-only" role="status" aria-live="polite">Loading profile.</p>
    </main>
  );
}
