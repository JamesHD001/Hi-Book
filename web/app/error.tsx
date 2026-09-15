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
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#090a0d] px-6 py-12 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(49,94,251,0.16),transparent_32%),radial-gradient(circle_at_82%_82%,rgba(139,92,246,0.12),transparent_30%)]" aria-hidden="true" />
      <section className="relative w-full max-w-xl rounded-[2rem] border border-white/10 bg-white/[0.045] p-8 text-center shadow-2xl shadow-black/25 backdrop-blur-xl sm:p-10">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-white/10 bg-white/[0.06] text-lg font-bold text-white/80" aria-hidden="true">
          H!
        </div>
        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.24em] text-white/40">Hi!Book</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">We hit a small snag.</h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-white/55">
          That request did not finish correctly. Your account and session are safe. Try the action again, and if the problem continues, come back in a moment.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-7 inline-flex min-h-12 items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-slate-100 focus-visible:outline-white"
        >
          Try again
        </button>
        <p className="mt-5 text-xs text-white/30">Hi!Book · Connect beyond distance</p>
      </section>
    </main>
  );
}
