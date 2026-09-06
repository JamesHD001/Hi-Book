import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-16">
      <Link href="/signup" className="text-sm font-semibold text-blue-600">← Back to sign up</Link>
      <h1 className="mt-8 text-4xl font-bold text-gray-950">Terms of Use</h1>
      <p className="mt-3 text-sm text-gray-500">Version 1.0 · Initial application draft</p>
      <div className="mt-10 space-y-8 leading-7 text-gray-700">
        <section><h2 className="text-xl font-semibold text-gray-950">Using Hi!Book</h2><p className="mt-2">Hi!Book is a social platform for genuine human connection. Use the service lawfully, respectfully, and in a way that does not harm other people or the platform.</p></section>
        <section><h2 className="text-xl font-semibold text-gray-950">Your account</h2><p className="mt-2">You are responsible for keeping your authentication credentials secure and for the activity performed through your account. You must provide accurate registration information and meet the platform&apos;s minimum age requirement.</p></section>
        <section><h2 className="text-xl font-semibold text-gray-950">Safety and moderation</h2><p className="mt-2">Hi!Book may restrict, remove, suspend, or deactivate content and accounts when required to protect users, comply with law, or enforce platform rules. Users can block and report other users or content.</p></section>
        <section><h2 className="text-xl font-semibold text-gray-950">Important</h2><p className="mt-2">This is the application&apos;s initial legal-document presentation and requires legal review before production publication.</p></section>
      </div>
    </main>
  );
}
