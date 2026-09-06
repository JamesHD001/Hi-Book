export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <section className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">
          Hi!Book
        </p>
        <h1 className="mt-3 text-3xl font-bold text-gray-950">Welcome back</h1>
        <p className="mt-2 text-sm text-gray-600">
          Authentication UI will be connected to Supabase Auth in the next
          application step.
        </p>
      </section>
    </main>
  );
}
