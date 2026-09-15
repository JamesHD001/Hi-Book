import Link from "next/link";
import SignupForm from "./SignupForm";

export default function SignupPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl overflow-hidden rounded-[2rem] border border-white/10 bg-white shadow-2xl shadow-black/30 lg:grid-cols-[0.8fr_1.2fr]">
        <section className="relative hidden overflow-hidden bg-slate-950 p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(59,130,246,0.35),transparent_34%),radial-gradient(circle_at_85%_80%,rgba(168,85,247,0.24),transparent_38%)]" />
          <div className="relative">
            <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.2em] text-white">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-sm font-black text-slate-950">H!</span>
              Hi!Book
            </Link>
            <p className="mt-20 max-w-md text-sm font-semibold uppercase tracking-[0.18em] text-blue-300">A place to belong</p>
            <h2 className="mt-4 max-w-xl text-4xl font-bold leading-tight tracking-tight xl:text-5xl">
              Meet people. Share your world. Stay connected.
            </h2>
            <p className="mt-5 max-w-lg text-base leading-7 text-slate-300">
              Create your identity once, then shape what you share and who can discover you as your community grows.
            </p>
          </div>
          <div className="relative rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
            <p className="text-sm font-semibold text-white">Designed around control</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">Your country, profile details, discovery settings, and social connections are governed by the platform&apos;s privacy controls.</p>
          </div>
        </section>

        <section className="flex items-center bg-white px-5 py-8 sm:px-8 lg:px-12 xl:px-14">
          <div className="mx-auto w-full max-w-2xl">
            <div className="lg:hidden">
              <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.2em] text-slate-950">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-sm font-black text-white">H!</span>
                Hi!Book
              </Link>
            </div>
            <div className="mt-7 lg:mt-0">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">Create your account</p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Start your Hi!Book journey.</h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500">Join a global community built around understanding and genuine connection.</p>
            </div>
            <SignupForm />
          </div>
        </section>
      </div>
    </main>
  );
}
