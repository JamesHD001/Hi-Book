import Link from "next/link";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl overflow-hidden rounded-[2rem] border border-white/10 bg-white shadow-2xl shadow-black/30 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="relative hidden overflow-hidden bg-slate-950 p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(59,130,246,0.35),transparent_34%),radial-gradient(circle_at_80%_80%,rgba(168,85,247,0.25),transparent_38%)]" />
          <div className="relative">
            <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.2em] text-white">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-sm font-black text-slate-950">H!</span>
              Hi!Book
            </Link>
            <p className="mt-20 max-w-md text-sm font-semibold uppercase tracking-[0.18em] text-blue-300">Your people. Your space.</p>
            <h2 className="mt-4 max-w-xl text-4xl font-bold leading-tight tracking-tight xl:text-5xl">
              Pick up where your community left off.
            </h2>
            <p className="mt-5 max-w-lg text-base leading-7 text-slate-300">
              Sign in to reconnect with people, discover new conversations, and keep your Hi!Book identity in your hands.
            </p>
          </div>
          <div className="relative grid grid-cols-2 gap-3 text-sm text-slate-300">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <p className="font-semibold text-white">Private by design</p>
              <p className="mt-1 leading-5">Your profile visibility stays under your control.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <p className="font-semibold text-white">Built to connect</p>
              <p className="mt-1 leading-5">Follow, message, share, and discover naturally.</p>
            </div>
          </div>
        </section>

        <section className="flex items-center bg-white px-6 py-10 sm:px-10 lg:px-14">
          <div className="mx-auto w-full max-w-md">
            <div className="lg:hidden">
              <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.2em] text-slate-950">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-sm font-black text-white">H!</span>
                Hi!Book
              </Link>
            </div>
            <div className="mt-8 lg:mt-0">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">Welcome back</p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Good to see you again.</h1>
              <p className="mt-3 text-sm leading-6 text-slate-500">Sign in to continue to your community.</p>
            </div>
            <LoginForm />
          </div>
        </section>
      </div>
    </main>
  );
}
