import Link from "next/link";
import { ArrowLeft, Globe2, LockKeyhole, Sparkles } from "lucide-react";
import HiBookLogo from "@/components/brand/HiBookLogo";
import SignupForm from "./SignupForm";
import "../auth.css";

export default function SignupPage() {
  return (
    <main className="auth-page">
      <div className="auth-shell" style={{ gridTemplateColumns: "0.85fr 1.15fr" }}>
        <section className="auth-visual lg:flex">
          <div className="auth-visual__decor" aria-hidden="true" style={{ left: "auto", right: "-10rem", top: "-10rem", width: "38rem", height: "38rem" }} />
          <div className="auth-visual__decor--secondary" aria-hidden="true" style={{ left: "-8rem", bottom: "-8rem", top: "auto", width: "30rem", height: "30rem" }} />
          <div className="auth-visual__decor--tertiary" aria-hidden="true" style={{ display: "none" }} />

          <header className="auth-visual__header">
            <Link href="/" className="group inline-flex items-center gap-3" aria-label="Hi!Book home">
              <HiBookLogo className="h-11 w-11 text-white transition group-hover:-translate-y-0.5" compact aria-hidden="true" />
              <span className="text-xl font-black tracking-[-0.05em]">Hi!Book</span>
            </Link>
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/40">Create account</span>
          </header>

          <div className="auth-visual__content" style={{ maxWidth: "38rem" }}>
            <div className="auth-visual__tag">Make an entrance</div>
            <h1 className="auth-visual__title">Your world.<br />Your way.</h1>
            <p className="auth-visual__lead">Create a profile that feels like you, meet people beyond your usual circle, and decide what parts of your world stay yours.</p>
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

          <footer className="auth-visual__footer border-t border-white/10 pt-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/30">Create · Discover · Connect</p>
            <Sparkles className="h-5 w-5 text-white/20" aria-hidden="true" />
          </footer>
        </section>

        <section className="auth-form-panel">
          <div className="auth-form-panel__inner" style={{ maxWidth: "42rem" }}>
            <div className="auth-brand-row lg:hidden">
              <Link href="/" className="inline-flex items-center gap-3 text-sm font-black">
                <HiBookLogo className="h-9 w-9 text-[var(--brand-primary)]" compact aria-hidden="true" />
                Hi!Book
              </Link>
              <span className="auth-kicker">Join Hi!Book</span>
            </div>
            <div className="mt-12 border-b border-[var(--divider)] pb-7 lg:mt-0">
              <div className="flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-[var(--brand-primary)]" />
                <p className="auth-kicker">New member</p>
              </div>
              <div className="mt-5 flex flex-wrap items-end justify-between gap-5">
                <div>
                  <h2 className="auth-heading" style={{ fontSize: "clamp(3rem,5vw,4rem)" }}>Make it<br />yours.</h2>
                  <p className="auth-lead">A few details to start. You&apos;ll have more control over your profile once you&apos;re inside.</p>
                </div>
                <p className="auth-kicker hidden pb-1 sm:block">Free / always</p>
              </div>
            </div>
            <SignupForm />
            <Link
              href="/login"
              className="auth-back-link group"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" aria-hidden="true" />
              Back to sign in
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
