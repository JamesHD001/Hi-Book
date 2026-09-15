import Link from "next/link";
import { ArrowUpRight, Compass, MessageCircle, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#07111f] px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <div className="relative mx-auto grid min-h-[calc(100vh-2rem)] max-w-7xl overflow-hidden rounded-[2rem] border border-white/10 bg-white shadow-2xl shadow-black/40 sm:min-h-[calc(100vh-3rem)] lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden overflow-hidden bg-[#07111f] p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">
          <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="absolute -bottom-40 -right-32 h-[30rem] w-[30rem] rounded-full bg-violet-500/15 blur-3xl" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:44px_44px]" />

          <div className="relative z-10">
            <Link href="/" className="inline-flex items-center gap-3 text-sm font-bold tracking-[0.16em] text-white">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-sm font-black text-[#07111f] shadow-lg shadow-black/20">H!</span>
              HI!BOOK
            </Link>

            <div className="mt-20 max-w-xl xl:mt-24">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-300/20 bg-blue-400/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-blue-200">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                Welcome back
              </div>
              <h2 className="mt-5 text-4xl font-bold leading-[1.08] tracking-tight xl:text-6xl">
                Your people are still here.
              </h2>
              <p className="mt-6 max-w-lg text-base leading-7 text-slate-300 xl:text-lg">
                Pick up conversations, discover what is happening around you, and stay connected to the people who matter.
              </p>
            </div>
          </div>

          <div className="relative z-10 mt-12 grid max-w-xl grid-cols-2 gap-3 xl:gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-md">
              <MessageCircle className="h-5 w-5 text-blue-300" aria-hidden="true" />
              <p className="mt-5 text-sm font-semibold text-white">Keep the conversation going</p>
              <p className="mt-1 text-xs leading-5 text-slate-400">Messages and meaningful connections in one place.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-md">
              <Compass className="h-5 w-5 text-violet-300" aria-hidden="true" />
              <p className="mt-5 text-sm font-semibold text-white">Find your community</p>
              <p className="mt-1 text-xs leading-5 text-slate-400">Discover people and conversations that interest you.</p>
            </div>
            <div className="col-span-2 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-md">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Your identity, your controls</p>
                <p className="mt-1 text-xs leading-5 text-slate-400">Privacy and discovery settings stay in your hands.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="flex items-center bg-white px-5 py-8 sm:px-10 lg:px-12 xl:px-16">
          <div className="mx-auto w-full max-w-md">
            <div className="lg:hidden">
              <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold tracking-[0.16em] text-slate-950">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-sm font-black text-white">H!</span>
                HI!BOOK
              </Link>
            </div>

            <div className="mt-8 lg:mt-0">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-950/10">
                <UserRound className="h-5 w-5" aria-hidden="true" />
              </div>
              <p className="mt-7 text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Member sign in</p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Welcome back.</h1>
              <p className="mt-3 text-sm leading-6 text-slate-500">Sign in to return to your Hi!Book community.</p>
            </div>

            <LoginForm />

            <Link href="/" className="group mt-8 inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 transition hover:text-slate-700">
              Back to Hi!Book home
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
