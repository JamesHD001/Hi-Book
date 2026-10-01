export default function PublicProfileLoading() {
  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto max-w-5xl animate-pulse">
        <div className="h-72 rounded-lg border border-[var(--border)] bg-[var(--surface)]" />
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <section className="h-64 rounded-lg border border-[var(--border)] bg-[var(--surface)]" />
          <aside className="h-48 rounded-lg border border-[var(--border)] bg-[var(--surface)]" />
        </div>
      </div>
      <p className="sr-only" role="status" aria-live="polite">Loading profile.</p>
    </main>
  );
}
