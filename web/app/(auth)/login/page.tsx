import Link from "next/link";
import { ArrowLeft, Compass, Globe2, MessageCircle, Sparkles } from "lucide-react";
import HiBookLogo from "@/components/brand/HiBookLogo";
import LoginForm from "./LoginForm";
import "../auth.css";

export default function LoginPage() {
  return (
    <main className="auth-page">
      <div className="auth-shell">
        <section className="auth-visual lg:flex">
          <div className="auth-visual__decor" aria-hidden="true" />
          <div className="auth-visual__decor--secondary" aria-hidden="true" />
          <div className="auth-visual__decor--tertiary" aria-hidden="true" />

          <header className="auth-visual__header">
            <Link href="/" className="group inline-flex items-center gap-3" aria-label="Hi!Book home">
              <HiBookLogo className="h-11 w-11 text-white transition group-hover:-translate-y-0.5" compact aria-hidden="true" />
              <span className="text-xl font-black tracking-[-0.05em]">Hi!Book</span>
            </Link>
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/40">Member access</span>
          </header>

          <div className="auth-visual__content">
            <div className="auth-visual__tag">Return to your world</div>
            <h1 className="auth-visual__title">There&apos;s more to say.</h1>
            <p className="auth-visual__lead">
              Your conversations, people and discoveries are still here. Pick up exactly where you left off.
            </p>

            <div className="auth-visual__pills">
              <div className="auth-visual__pill">
                <MessageCircle className="h-4 w-4 text-[var(--brand-accent)]" aria-hidden="true" />
                <span>Conversations</span>
              </div>
              <div className="auth-visual__pill">
                <Compass className="h-4 w-4 text-[var(--brand-accent)]" aria-hidden="true" />
                <span>Discovery</span>
              </div>
              <div className="auth-visual__pill">
                <Globe2 className="h-4 w-4 text-[var(--brand-accent)]" aria-hidden="true" />
                <span>A wider world</span>
              </div>
            </div>
          </div>

          <footer className="auth-visual__footer border-t border-white/10 pt-6">
            <p className="max-w-md text-xs leading-5 text-white/35">
              A social space for people, stories, interests and the unexpected connections between them.
            </p>
            <Sparkles className="h-5 w-5 text-white/20" aria-hidden="true" />
          </footer>
        </section>

        <section className="auth-form-panel">
          <div className="auth-form-panel__inner">
            <div className="auth-brand-row lg:hidden">
              <Link href="/" className="inline-flex items-center gap-3 text-sm font-black">
                <HiBookLogo className="h-9 w-9 text-[var(--brand-primary)]" compact aria-hidden="true" />
                Hi!Book
              </Link>
              <span className="auth-kicker">Sign in</span>
            </div>

            <div>
              <div className="flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-[var(--brand-primary)]" />
                <p className="auth-kicker">Member access</p>
              </div>
              <h2 className="auth-heading">
                Welcome<br />back.
              </h2>
              <p className="auth-lead">
                Sign in to continue your conversations and discover what&apos;s happening around you.
              </p>
            </div>

            <LoginForm />

            <div className="mt-8 border-t border-[var(--divider)] pt-6">
              <Link href="/" className="auth-back-link group">
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
