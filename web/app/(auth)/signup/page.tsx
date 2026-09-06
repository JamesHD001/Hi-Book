import Link from "next/link";
import SignupForm from "./SignupForm";

export default function SignupPage() {
  return (
    <main className="min-h-screen bg-gray-50 px-6 py-12">
      <section className="mx-auto w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-8 shadow-sm sm:p-10">
        <Link href="/" className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">Hi!Book</Link>
        <h1 className="mt-3 text-3xl font-bold text-gray-950">Create your account</h1>
        <p className="mt-2 text-sm leading-6 text-gray-600">Join a global community built around understanding and genuine connection.</p>
        <SignupForm />
      </section>
    </main>
  );
}
