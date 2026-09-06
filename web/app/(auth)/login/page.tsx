import Link from "next/link";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6 py-12">
      <section className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <Link href="/" className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">
          Hi!Book
        </Link>
        <h1 className="mt-3 text-3xl font-bold text-gray-950">Welcome back</h1>
        <p className="mt-2 text-sm text-gray-600">Sign in to continue to your community.</p>
        <LoginForm />
      </section>
    </main>
  );
}
