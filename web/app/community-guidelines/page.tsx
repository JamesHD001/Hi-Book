import Link from "next/link";

export default function CommunityGuidelinesPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-16 text-slate-900">
      <article className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-12">
        <Link href="/" className="text-sm font-semibold text-blue-600 hover:text-blue-800">
          Back to Hi!Book
        </Link>

        <header className="mt-8 border-b border-slate-200 pb-8">
          <h1 className="text-4xl font-bold tracking-tight">Community Guidelines</h1>
          <p className="mt-3 text-sm text-slate-500">Version 1.0 · Initial application draft</p>
        </header>

        <div className="mt-10 space-y-8 leading-7 text-slate-700">
          <section>
            <h2 className="text-xl font-semibold text-slate-950">Treat people with respect</h2>
            <p className="mt-2">Hi!Book is intended for genuine human connection. Do not use the platform to harass, threaten, intimidate, or deliberately target other people.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-950">Keep interactions safe</h2>
            <p className="mt-2">Do not use Hi!Book for harmful, illegal, deceptive, or abusive activity. Respect other users&apos; boundaries, privacy, and consent.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-950">Use reporting and blocking tools</h2>
            <p className="mt-2">If another user or piece of content violates these guidelines, use the available reporting and blocking controls. Reports may be reviewed through Hi!Book&apos;s moderation processes.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-950">Moderation</h2>
            <p className="mt-2">Hi!Book may remove content or restrict accounts when necessary to protect users, enforce platform rules, or comply with applicable requirements. Moderation decisions may be subject to the platform&apos;s appeal process where available.</p>
          </section>

          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <h2 className="text-xl font-semibold text-amber-950">Important</h2>
            <p className="mt-2 text-amber-900">These are the application&apos;s initial community guidelines and require further policy and legal review before production publication.</p>
          </section>
        </div>

        <div className="mt-10 flex flex-wrap gap-4 border-t border-slate-200 pt-6 text-sm font-semibold">
          <Link href="/terms" className="text-blue-600 hover:text-blue-800">Terms of Use</Link>
          <Link href="/privacy" className="text-blue-600 hover:text-blue-800">Privacy Policy</Link>
        </div>
      </article>
    </main>
  );
}
