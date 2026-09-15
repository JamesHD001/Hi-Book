export default function Loading() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#090a0d] px-6 py-12 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(49,94,251,0.16),transparent_32%),radial-gradient(circle_at_80%_80%,rgba(139,92,246,0.12),transparent_30%)]" aria-hidden="true" />
      <section className="relative w-full max-w-sm text-center" role="status" aria-live="polite">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-white/10 bg-white/[0.06] shadow-2xl shadow-black/20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/15 border-t-white" aria-hidden="true" />
        </div>
        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.24em] text-white/45">Hi!Book</p>
        <h1 className="mt-2 text-lg font-semibold tracking-tight text-white">Getting things ready</h1>
        <p className="mt-2 text-sm leading-6 text-white/50">Your next Hi!Book experience is loading.</p>
      </section>
    </main>
  );
}
