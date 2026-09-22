import Link from "next/link";
import { ArrowRight, Globe2, LockKeyhole, Sparkles } from "lucide-react";
import HiBookLogo from "@/components/brand/HiBookLogo";
import SignupForm from "./SignupForm";

export default function SignupPage() {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto grid min-h-screen max-w-[1600px] lg:grid-cols-[0.85fr_1.15fr]">
        <section className="relative hidden overflow-hidden bg-[var(--brand-primary-dark)] px-10 py-9 text-white lg:flex lg:flex-col xl:px-16">
          <div className="absolute inset-0" aria-hidden="true">
            <div className="absolute right-[-10rem] top-[-10rem] h-[38rem] w-[38rem] rounded-full border border-white/10" />
            <div className="absolute bottom-[-8rem] left-[-8rem] h-[30rem] w-[30rem] rounded-full bg-[var(--brand-primary)]/20 blur-3xl" />
            <div className="absolute left-0 top-1/3 h-px w-full bg-white/10" />
          </div>
          <header className="relative z-10 flex items-center justify-between">
            <Link href="/" className="group inline-flex items-center gap-3" aria-label="Hi!Book home">
              <HiBookLogo className="h-11 w-11 text-white transition group-hover:-translate-y-0.5" compact aria-hidden="true" />
              <span className="text-xl font-black tracking-[-0.05em]">Hi!Book</span>
            </Link>
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/40">Create account</span>
          </header>
          <div className="relative z-10 my-auto max-w-2xl py-16">
            <div className="flex items-center gap-3 text-[var(--brand-accent)]">
              <span className="h-px w-10 bg-current" />
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em]">Make an entrance</p>
            </div>
            <h1 className="mt-7 text-[clamp(3.5rem,7vw,7rem)] font-black leading-[0.88] tracking-[-0.075em]">Your world.<br />Your way.</h1>
            <p className="mt-8 max-w-lg text-lg leading-8 text-white/65">Create a profile that feels like you, meet people beyond your usual circle, and decide what parts of your world stay yours.</p>
            <div className="mt-14 grid max-w-xl gap-px border border-white/10 bg-white/10 sm:grid-cols-2">
              <div className="bg-[var(--brand-primary-dark)] p-5">
                <Globe2 className="h-5 w-5 text-[var(--brand-accent)]" aria-hidden="true" />
                <p className="mt-8 text-sm font-bold">Find your people</p>
                <p className="mt-1 text-xs leading-5 text-white/35">Interests, languages and stories can cross borders.</p>
              </div>
              <div className="bg-[var(--brand-primary-dark)] p-5">
                <LockKeyhole className="h-5 w-5 text-[var(--brand-accent)]" aria-hidden="true" />
                <p className="mt-8 text-sm font-bold">Keep your boundaries</p>
                <p className="mt-1 text-xs leading-5 text-white/35">Visibility and discovery are choices, not defaults.</p>
              </div>
            </div>
          </div>
          <footer className="relative z-10 flex items-center justify-between border-t border-white/10 pt-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/30">Create · Discover · Connect</p>
            <Sparkles className="h-5 w-5 text-white/20" aria-hidden="true" />
          </footer>
        </section>

        <section className="flex min-h-screen items-start bg-[var(--surface)] px-5 py-9 sm:px-10 lg:items-center lg:px-12 xl:px-16">
          <div className="mx-auto w-full max-w-2xl">
            <div className="flex items-center justify-between lg:hidden">
              <Link href="/" className="inline-flex items-center gap-3 text-sm font-black">
                <HiBookLogo className="h-9 w-9 text-[var(--brand-primary)]" compact aria-hidden="true" />
                Hi!Book
              </Link>
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">Join Hi!Book</span>
            </div>
            <div className="mt-12 border-b border-[var(--divider)] pb-7 lg:mt-0">
              <div className="flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-[var(--brand-primary)]" />
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted)]">New member</p>
              </div>
              <div className="mt-5 flex flex-wrap items-end justify-between gap-5">
                <div>
                  <h2 className="text-5xl font-black leading-none tracking-[-0.07em] sm:text-6xl">Make it<br />yours.</h2>
                  <p className="mt-5 max-w-xl text-sm leading-6 text-[var(--muted)]">A few details to start. You&apos;ll have more control over your profile once you&apos;re inside.</p>
                </div>
                <p className="hidden pb-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)] sm:block">Free / always</p>
              </div>
            </div>
            <SignupForm />
            <Link href="/login" className="group mt-8 inline-flex items-center gap-2 text-xs font-bold text-[var(--muted)] transition hover:text-[var(--foreground)]">
              Already a member? Sign in
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
