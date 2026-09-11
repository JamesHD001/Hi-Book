export default function Loading() {
  return (
    <main className="flex min-h-[50vh] items-center justify-center px-6 py-12">
      <div className="text-center" role="status" aria-live="polite">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" aria-hidden="true" />
        <p className="mt-4 text-sm font-medium text-slate-600">Loading Hi!Book…</p>
      </div>
    </main>
  );
}
