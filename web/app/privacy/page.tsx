import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Eye, ShieldCheck } from "lucide-react";

const sections = [
  [
    "01",
    "Information we use",
    "Hi!Book uses information needed to create and operate your account, provide social features, protect users, and maintain platform security. Private identity and authentication information is not treated as public profile information.",
  ],
  [
    "02",
    "Your control",
    "You control important profile visibility and discovery settings. Blocking, reporting, and privacy controls are part of the platform's safety architecture.",
  ],
  [
    "03",
    "Retention and deletion",
    "Account deletion follows the platform's deletion and retention workflow. Some safety, moderation, legal, financial, and security records may need to be retained where required.",
  ],
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-(--background) text-(--foreground)">
      <div className="mx-auto grid min-h-screen max-w-375 lg:grid-cols-[0.34fr_0.66fr]">
        <aside className="relative overflow-hidden bg-[var(--surface-inverse)] px-6 py-8 text-white sm:px-10 lg:min-h-screen lg:px-12">
          <div className="absolute -right-24 top-24 h-80 w-80 rounded-full border border-white/10" aria-hidden="true" />
          <div className="relative z-10 flex h-full flex-col">
            <div className="flex items-center justify-between">
              <Link href="/" className="inline-flex items-center gap-3 text-sm font-black text-white">
                <span className="grid h-11 w-11 rotate-[5deg] place-items-center rounded-xl bg-(--brand-primary-soft) text-xs font-black text-(--brand-primary-dark)">
                  H!
                </span>
                Hi!Book
              </Link>
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/35">Legal / 02</span>
            </div>

            <div className="my-auto py-16">
              <Eye className="h-8 w-8 text-(--brand-accent)" aria-hidden="true" />
              <p className="mt-10 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-(--brand-accent)">
                Legal / privacy
              </p>
              <h1 className="mt-5 text-5xl font-black leading-[0.9] tracking-[-0.07em] xl:text-7xl">
                Your world
                <br />
                has edges.
              </h1>
              <p className="mt-7 max-w-sm text-sm leading-6 text-white/65">
                A high-level view of the information Hi!Book uses and the choices around it.
              </p>
            </div>

            <Link
              href="/signup"
              className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-white/60 transition hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to sign up
            </Link>
          </div>
        </aside>

        <article className="bg-[var(--surface)] px-6 py-10 sm:px-10 sm:py-14 lg:px-16 xl:px-24">
          <header className="flex items-center justify-between border-b border-[var(--divider)] pb-6">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--brand-primary-dark)]">Privacy Policy</p>
              <p className="mt-2 text-xs text-(--muted)">Version 1.0 · Initial draft</p>
            </div>
            <ShieldCheck className="h-5 w-5 text-(--muted)" aria-hidden="true" />
          </header>

          <div className="py-12">
            <p className="max-w-3xl text-3xl font-black leading-tight tracking-[-0.055em] sm:text-5xl">
              You should know what you share, who can see it, and what happens next.
            </p>

            <div className="mt-12 divide-y divide-(--divider) border-y border-(--divider)">
              {sections.map(([number, title, text]) => (
                <section key={number} className="grid gap-5 py-8 sm:grid-cols-[54px_0.8fr_1.4fr]">
                  <span className="font-mono text-xs font-bold text-(--brand-primary-dark)">{number}</span>
                  <h2 className="text-lg font-black tracking-tight text-(--foreground)">{title}</h2>
                  <p className="text-sm leading-7 text-(--text-secondary)">{text}</p>
                </section>
              ))}
            </div>

            <div className="mt-8 border-l-2 border-(--brand-accent) bg-(--surface-secondary) p-5">
              <p className="text-xs font-black uppercase tracking-[0.15em] text-(--foreground)">Draft status</p>
              <p className="mt-2 text-sm leading-6 text-(--text-secondary)">
                This is the application&apos;s initial legal-document presentation and requires legal review before production publication.
              </p>
            </div>
          </div>

          <nav className="flex flex-wrap gap-x-7 gap-y-3 border-t border-(--divider) pt-6 text-xs font-bold" aria-label="Legal documents">
            <Link href="/terms" className="hover:text-(--brand-primary-dark)">Terms</Link>
            <Link href="/data-protection" className="hover:text-(--brand-primary-dark)">Data Protection</Link>
            <Link href="/community-guidelines" className="hover:text-(--brand-primary-dark)">Community Guidelines</Link>
            <Link href="/" className="ml-auto inline-flex items-center gap-1 text-(--muted) hover:text-(--foreground)">
              Home
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </nav>
        </article>
      </div>
    </main>
  );
}
