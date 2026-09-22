import Link from "next/link";
import { ArrowLeft, Compass, Globe2, MessageCircle, Sparkles } from "lucide-react";
import HiBookLogo from "@/components/brand/HiBookLogo";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto grid min-h-screen max-w-[1600px] lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden overflow-hidden bg-[var(--brand-primary-dark)] px-10 py-9 text-white lg:flex lg:flex-col xl:px-16">
          <div className="absolute inset-0 opacity-80" aria-hidden="true">
            <div className="absolute -left-24 -top-24 h-[34rem] w-[34rem] rounded-full border border-white/10" />
            <div className="absolute -left-8 top-8 h-72 w-72 rounded-full bg-[var(--brand-primary)]/25 blur-3xl" />
            <div className="absolute bottom-[-12rem] right-[-8rem] h-[40rem] w-[40rem] rounded-full border border-[var(--brand-accent)]/15" />
            <div className="absolute inset-x-0 top-1/2 h-px bg-white/10" />
          </div>

          <header className="relative z-10 flex items-center justify-between">
            <Link href="/" className="group inline-flex items-center gap-3" aria-label="Hi!Book home">
              <HiBookLogo className="h-11 w-11 text-white transition group-hover:-translate-y-0.5" compact aria-hidden="true" />
              <span className="text-xl font-black tracking-[-0.05em]">Hi!Book</span>
            </Link>
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/40">Member access</span>
          </header>

          <div className="relative z-10 my-auto max-w-4xl py-16">
            <div className="flex items-center gap-3 text-[var(--brand-accent)]">
              <span className="h-px w-10 bg-current" />
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em]">Return to your world</p>
            </div>
            <h1 className="mt-7 max-w-4xl text-[clamp(3.5rem,7vw,7rem)] font-black leading-[0.88] tracking-[-0.075em]">
              There&apos;s more to say.
            </h1>
            <p className="mt-8 max-w-xl text-lg leading-8 text-white/65">
              Your conversations, people and discoveries are still here. Pick up exactly where you left off.
            </p>

            <div className="mt-14 flex max-w-2xl flex-wrap gap-3">
              <div className="flex items-center gap-3 border border-white/10 bg-white/[0.05] px-4 py-3">
                <MessageCircle className="h-4 w-4 text-[var(--brand-accent)]" aria-hidden="true" />
                <span className="text-xs font-bold">Conversations</span>
              </div>
              <div className="flex items-center gap-3 border border-white/10 bg-white/[0.05] px-4 py-3">
                <Compass className="h-4 w-4 text-[var(--brand-accent)]" aria-hidden="true" />
                <span className="text-xs font-bold">Discovery</span>
              </div>
              <div className="flex items-center gap-3 border border-white/10 bg-white/[0.05] px-4 py-3">
                <Globe2 className="h-4 w-4 text-[var(--brand-accent)]" aria-hidden="true" />
                <span className="text-xs font-bold">A wider world</span>
              </div>
            </div>
          </div>

          <footer className="relative z-10 flex items-end justify-between gap-8 border-t border-white/10 pt-6">
            <p className="max-w-md text-xs leading-5 text-white/35">
              A social space for people, stories, interests and the unexpected connections between them.
            </p>
            <Sparkles className="h-5 w-5 text-white/20" aria-hidden="true" />
          </footer>
        </section>

        <section className="flex min-h-screen items-center bg-[var(--surface)] px-5 py-10 sm:px-10 lg:px-12 xl:px-16">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-10 flex items-center justify-between lg:hidden">
              <Link href="/" className="inline-flex items-center gap-3 text-sm font-black">
                <HiBookLogo className="h-9 w-9 text-[var(--brand-primary)]" compact aria-hidden="true" />
                Hi!Book
              </Link>
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">Sign in</span>
            </div>

            <div>
              <div className="flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-[var(--brand-primary)]" />
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted)]">Member access</p>
              </div>
              <h2 className="mt-5 text-5xl font-black leading-none tracking-[-0.07em] sm:text-6xl">
                Welcome<br />back.
              </h2>
              <p className="mt-5 text-sm leading-6 text-[var(--muted)]">
                Sign in to continue your conversations and discover what&apos;s happening around you.
              </p>
            </div>

            <LoginForm />

            <div className="mt-8 border-t border-[var(--divider)] pt-6">
              <Link href="/" className="group inline-flex items-center gap-2 text-xs font-bold text-[var(--muted)] transition hover:text-[var(--foreground)]">
                <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" aria-hidden="true" />
                Back home
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
