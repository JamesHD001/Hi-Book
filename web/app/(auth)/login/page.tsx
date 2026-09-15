import Link from "next/link";
import { ArrowLeft, Compass, MessageCircle, ShieldCheck, UserRound } from "lucide-react";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#f4f1ea] px-3 py-3 text-[#171717] sm:px-5 sm:py-5">
      <div className="mx-auto grid min-h-[calc(100vh-1.5rem)] max-w-[1440px] overflow-hidden rounded-[2rem] border border-black/10 bg-[#fbfaf7] shadow-[0_30px_90px_rgba(23,23,23,0.12)] sm:min-h-[calc(100vh-2.5rem)] lg:grid-cols-[1.1fr_0.9fr]">
        <section className="relative hidden overflow-hidden bg-[#111827] p-8 text-white lg:flex lg:flex-col lg:justify-between xl:p-12">
          <div className="absolute inset-0" aria-hidden="true">
            <div className="absolute -left-40 top-20 h-[30rem] w-[30rem] rounded-full border border-white/10" />
            <div className="absolute left-20 top-40 h-72 w-72 rounded-full bg-blue-600/20 blur-3xl" />
            <div className="absolute bottom-0 right-0 h-[28rem] w-[28rem] rounded-full bg-violet-600/15 blur-3xl" />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:42px_42px]" />
          </div>
          <div className="relative z-10">
            <Link href="/" className="inline-flex items-center gap-3" aria-label="Hi!Book home">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-sm font-black text-[#111827]">H!</span>
              <span className="text-lg font-extrabold tracking-[-0.04em]">Hi!Book</span>
            </Link>
            <div className="mt-28 max-w-2xl xl:mt-36">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-300">Your community is waiting</p>
              <h1 className="mt-5 text-5xl font-extrabold leading-[0.98] tracking-[-0.06em] xl:text-7xl">Come back to the people and conversations that matter.</h1>
              <p className="mt-7 max-w-lg text-base leading-7 text-slate-300">Pick up where you left off, discover something new, and stay in control of your corner of Hi!Book.</p>
            </div>
          </div>
          <div className="relative z-10 grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4"><MessageCircle className="h-5 w-5 text-blue-300" aria-hidden="true" /><p className="mt-6 text-sm font-bold">Conversations</p><p className="mt-1 text-xs text-slate-400">Stay close to your people.</p></div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4"><Compass className="h-5 w-5 text-violet-300" aria-hidden="true" /><p className="mt-6 text-sm font-bold">Discovery</p><p className="mt-1 text-xs text-slate-400">Meet beyond your circle.</p></div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4"><ShieldCheck className="h-5 w-5 text-emerald-300" aria-hidden="true" /><p className="mt-6 text-sm font-bold">Control</p><p className="mt-1 text-xs text-slate-400">Choose what you share.</p></div>
          </div>
        </section>

        <section className="flex items-center bg-[#fbfaf7] px-5 py-10 sm:px-10 lg:px-12 xl:px-16">
          <div className="mx-auto w-full max-w-md">
            <div className="lg:hidden"><Link href="/" className="inline-flex items-center gap-3 text-sm font-extrabold"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#111827] text-xs font-black text-white">H!</span>Hi!Book</Link></div>
            <div className="mt-10 lg:mt-0">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#111827] text-white"><UserRound className="h-5 w-5" aria-hidden="true" /></div>
              <p className="mt-8 text-xs font-extrabold uppercase tracking-[0.18em] text-blue-600">Member sign in</p>
              <h2 className="mt-2 text-4xl font-extrabold tracking-[-0.05em]">Good to see you.</h2>
              <p className="mt-3 text-sm leading-6 text-slate-500">Sign in and return to your Hi!Book world.</p>
            </div>
            <LoginForm />
            <Link href="/" className="group mt-8 inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-slate-950"><ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" aria-hidden="true" />Back to Hi!Book</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
