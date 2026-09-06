import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-16">
      <Link href="/signup" className="text-sm font-semibold text-blue-600">← Back to sign up</Link>
      <h1 className="mt-8 text-4xl font-bold text-gray-950">Privacy Policy</h1>
      <p className="mt-3 text-sm text-gray-500">Version 1.0 · Initial application draft</p>
      <div className="mt-10 space-y-8 leading-7 text-gray-700">
        <section><h2 className="text-xl font-semibold text-gray-950">Information we use</h2><p className="mt-2">Hi!Book uses information needed to create and operate your account, provide social features, protect users, and maintain platform security. Private identity and authentication information is not treated as public profile information.</p></section>
        <section><h2 className="text-xl font-semibold text-gray-950">Your control</h2><p className="mt-2">You control important profile visibility and discovery settings. Blocking, reporting, and privacy controls are part of the platform&apos;s safety architecture.</p></section>
        <section><h2 className="text-xl font-semibold text-gray-950">Retention and deletion</h2><p className="mt-2">Account deletion follows the platform&apos;s deletion and retention workflow. Some safety, moderation, legal, financial, and security records may need to be retained where required.</p></section>
        <section><h2 className="text-xl font-semibold text-gray-950">Important</h2><p className="mt-2">This is the application&apos;s initial legal-document presentation and requires legal review before production publication.</p></section>
      </div>
    </main>
  );
}
