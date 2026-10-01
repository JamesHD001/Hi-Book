import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Globe2, LockKeyhole, Sparkles } from "lucide-react";
import HiBookLogo from "@/components/brand/HiBookLogo";
import SignupForm from "./SignupForm";
import "../auth.css";

export default function SignupPage() {
  return (
    <main className="auth-page auth-page--entry">
      <div className="auth-shell auth-shell--signup">
        <section className="auth-visual auth-visual--signup">
          <Image
            src="/media/hibook-community-01.jpg"
            alt="Friends sitting together and sharing a moment"
            fill
            priority
            sizes="(max-width: 1023px) 100vw, 44vw"
            className="auth-visual__image"
          />
          <div className="auth-visual__shade" aria-hidden="true" />

          <header className="auth-visual__header">
            <Link href="/" className="group inline-flex items-center gap-3" aria-label="Hi!Book home">
              <HiBookLogo className="h-11 w-11 text-white transition group-hover:-translate-y-0.5" compact aria-hidden="true" />
              <span className="text-xl font-black tracking-tighter">Hi!Book</span>
            </Link>
            <span className="auth-visual__eyebrow">Create account</span>
          </header>

          <div className="auth-visual__content auth-visual__content--signup">
            <div className="auth-visual__tag">A wider world starts here</div>
            <h1 className="auth-visual__title">Your world.<br /><em>Your way.</em></h1>
            <p className="auth-visual__lead">Meet people beyond your usual circle, share what matters, and choose what stays yours.</p>
            <div className="auth-visual__tiles">
              <div className="auth-visual__tile">
                <Globe2 className="h-5 w-5 text-(--brand-accent)" aria-hidden="true" />
                <p>Find your people</p>
                <span>Interests and stories cross borders.</span>
              </div>
              <div className="auth-visual__tile">
                <LockKeyhole className="h-5 w-5 text-(--brand-accent)" aria-hidden="true" />
                <p>Keep your boundaries</p>
                <span>Visibility is yours to control.</span>
              </div>
            </div>
          </div>

          <footer className="auth-visual__footer">
            <p>Make room for a new point of view.</p>
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          </footer>
        </section>

        <section className="auth-form-panel">
          <div className="auth-form-panel__inner auth-form-panel__inner--signup">
            <div className="auth-brand-row lg:hidden">
              <Link href="/" className="inline-flex items-center gap-3 text-sm font-black">
                <HiBookLogo className="h-9 w-9 text-(--brand-primary)" compact aria-hidden="true" />
                Hi!Book
              </Link>
              <span className="auth-kicker">Join Hi!Book</span>
            </div>
            <div className="mt-12 border-b border-(--divider) pb-7 lg:mt-0">
              <div className="flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-(--brand-primary)" />
                <p className="auth-kicker">New member</p>
              </div>
              <div className="mt-5 flex flex-wrap items-end justify-between gap-5">
                <div>
                  <h2 className="auth-heading auth-heading--signup">Make it<br />yours.</h2>
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
