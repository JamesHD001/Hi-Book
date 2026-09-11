"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12">
      <section className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">Hi!Book</p>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-950">Something went wrong</h1>
        <p className="mt-3 leading-7 text-slate-600">
          We could not complete that request. You can try again without losing your account or session.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-6 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
        >
          Try again
        </button>
      </section>
    </main>
  );
}
