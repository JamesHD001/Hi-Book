import Link from "next/link";

export default function DataProtectionPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-16 text-slate-900">
      <article className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-12">
        <Link href="/" className="text-sm font-semibold text-blue-600 hover:text-blue-800">
          Back to Hi!Book
        </Link>

        <header className="mt-8 border-b border-slate-200 pb-8">
          <h1 className="text-4xl font-bold tracking-tight">Data Protection &amp; Usage</h1>
          <p className="mt-3 text-sm text-slate-500">Version 1.0 · Initial application draft</p>
        </header>

        <div className="mt-10 space-y-8 leading-7 text-slate-700">
          <section>
            <h2 className="text-xl font-semibold text-slate-950">What this page covers</h2>
            <p className="mt-2">
              This page explains at a high level how Hi!Book uses and protects information needed to operate the service. It should be read together with the Privacy Policy and Terms of Use.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-950">How information is used</h2>
            <p className="mt-2">
              Hi!Book uses account, profile, social, and security information to provide features such as authentication, profiles, discovery, messaging, notifications, moderation, reporting, and account management. Information is used for the purposes described in the applicable privacy documentation rather than being treated as public by default.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-950">Public and private information</h2>
            <p className="mt-2">
              Some profile information may be visible to other users according to your privacy and discovery settings. Authentication credentials and other private account information are not intended to be public profile information.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-950">Your controls</h2>
            <p className="mt-2">
              Hi!Book provides controls for profile visibility, country visibility, messaging permissions, discoverability, blocking, reporting, notification preferences, and account deletion. Available controls may depend on the feature and the current state of your account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-950">Protection and retention</h2>
            <p className="mt-2">
              The platform uses authentication, authorization, privacy controls, database security policies, and other safeguards to protect information. Some records may need to be retained for security, moderation, legal, or operational reasons. The applicable retention rules are described in the Privacy Policy and related legal documentation.
            </p>
          </section>

          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <h2 className="text-xl font-semibold text-amber-950">Important</h2>
            <p className="mt-2 text-amber-900">
              This is the application&apos;s initial policy presentation and requires legal review before production publication. It is not a substitute for jurisdiction-specific legal advice.
            </p>
          </section>
        </div>

        <div className="mt-10 flex flex-wrap gap-4 border-t border-slate-200 pt-6 text-sm font-semibold">
          <Link href="/privacy" className="text-blue-600 hover:text-blue-800">Privacy Policy</Link>
          <Link href="/terms" className="text-blue-600 hover:text-blue-800">Terms of Use</Link>
        </div>
      </article>
    </main>
  );
}
