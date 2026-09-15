import Link from "next/link";
import { ArrowRight, Globe2, LockKeyhole, Sparkles } from "lucide-react";
import SignupForm from "./SignupForm";

export default function SignupPage() {
  return (
    <main className="min-h-screen bg-[#f4f1ea] px-3 py-3 text-[#171717] sm:px-5 sm:py-5">
      <div className="mx-auto grid min-h-[calc(100vh-1.5rem)] max-w-[1440px] overflow-hidden rounded-[2rem] border border-black/10 bg-[#fbfaf7] shadow-[0_30px_90px_rgba(23,23,23,0.12)] sm:min-h-[calc(100vh-2.5rem)] lg:grid-cols-[0.9fr_1.1fr]">
        <section className="relative hidden overflow-hidden bg-[#111827] p-8 text-white lg:flex lg:flex-col lg:justify-between xl:p-12">
          <div className="absolute inset-0 opacity-60" aria-hidden="true">
            <div className="absolute -left-32 -top-24 h-96 w-96 rounded-full border border-white/10" />
            <div className="absolute left-10 top-10 h-72 w-72 rounded-full bg-blue-600/20 blur-3xl" />
            <div className="absolute -bottom-40 -right-20 h-[34rem] w-[34rem] rounded-full border border-blue-300/10" />
            <div className="absolute bottom-20 right-20 h-48 w-48 rounded-full bg-violet-500/15 blur-3xl" />
          </div>

          <div className="relative z-10">
            <Link href="/" className="inline-flex items-center gap-3" aria-label="Hi!Book home">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-sm font-black text-[#111827]">H!</span>
              <span className="text-lg font-extrabold tracking-[-0.04em]">Hi!Book</span>
            </Link>
            <div className="mt-24 max-w-xl xl:mt-32">
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-blue-300">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                Start your profile
              </p>
              <h1 className="mt-5 text-5xl font-extrabold leading-[0.98] tracking-[-0.06em] xl:text-7xl">
                Your name is the beginning of your story.
              </h1>
              <p className="mt-7 max-w-md text-base leading-7 text-slate-300">
                Hi!Book is a place to show up as yourself, discover people outside your usual circle, and choose how much of your world you share.
              </p>
            </div>
          </div>

          <div className="relative z-10 grid grid-cols-2 gap-3 xl:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
              <Globe2 className="h-5 w-5 text-blue-300" aria-hidden="true" />
              <p className="mt-6 text-sm font-bold">Across borders</p>
              <p className="mt-1 text-xs leading-5 text-slate-400">People, languages and interests from everywhere.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
              <LockKeyhole className="h-5 w-5 text-violet-300" aria-hidden="true" />
              <p className="mt-6 text-sm font-bold">Your controls</p>
              <p className="mt-1 text-xs leading-5 text-slate-400">Privacy and discovery choices belong to you.</p>
            </div>
            <div className="col-span-2 rounded-2xl border border-white/10 bg-white/[0.06] p-4 xl:col-span-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">01 / 02 / 03</p>
              <p className="mt-3 text-sm font-bold">Create · Discover · Connect</p>
            </div>
          </div>
        </section>

        <section className="flex items-start bg-[#fbfaf7] px-5 py-8 sm:px-10 sm:py-12 lg:items-center lg:px-12 xl:px-16">
          <div className="mx-auto w-full max-w-2xl">
            <div className="lg:hidden">
              <Link href="/" className="inline-flex items-center gap-3 text-sm font-extrabold">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#111827] text-xs font-black text-white">H!</span>
                Hi!Book
              </Link>
            </div>
            <div className="mt-8 border-b border-black/10 pb-6 lg:mt-0">
              <div className="flex items-end justify-between gap-5">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-blue-600">Member registration</p>
                  <h2 className="mt-2 text-3xl font-extrabold tracking-[-0.05em] sm:text-4xl">Make it yours.</h2>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">Tell us who you are. The rest of your Hi!Book experience starts here.</p>
                </div>
                <div className="hidden text-right sm:block">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Membership</p>
                  <p className="mt-1 text-sm font-bold">Free / always</p>
                </div>
              </div>
            </div>
            <SignupForm />
            <Link href="/login" className="group mt-7 inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-slate-950">
              Already a member? Sign in <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
