"use client";

import Link from "next/link";

export default function ComingSoon({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <main>
      <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-(--border) bg-(--surface) p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-(--brand-primary-dark)">Hi!Book 2.0</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">{title}</h1>
          <p className="mt-3 max-w-2xl leading-7 text-(--text-secondary)">{description}</p>
          <Link href="/community" className="mt-8 inline-flex rounded-md bg-(--brand-primary) px-5 py-3 text-sm font-semibold text-white hover:bg-(--brand-primary-dark)">
            Back to community
          </Link>
        </div>
      </section>
    </main>
  );
}
