import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Database, LockKeyhole, ShieldCheck } from "lucide-react";

export default function DataProtectionPage() {
  const sections = [
    [
      "01",
      "What this page covers",
      "This page explains at a high level how Hi!Book uses and protects information needed to operate the service. It should be read together with the Privacy Policy and Terms of Use.",
    ],
    [
      "02",
      "How information is used",
      "Hi!Book uses account, profile, social, and security information to provide features such as authentication, profiles, discovery, messaging, notifications, moderation, reporting, and account management. Information is used for the purposes described in the applicable privacy documentation rather than being treated as public by default.",
    ],
    [
      "03",
      "Public and private information",
      "Some profile information may be visible to other users according to your privacy and discovery settings. Authentication credentials and other private account information are not intended to be public profile information.",
    ],
    [
      "04",
      "Your controls",
      "Hi!Book provides controls for profile visibility, country visibility, messaging permissions, discoverability, blocking, reporting, notification preferences, and account deletion. Available controls may depend on the feature and the current state of your account.",
    ],
    [
      "05",
      "Protection and retention",
      "The platform uses authentication, authorization, privacy controls, database security policies, and other safeguards to protect information. Some records may need to be retained for security, moderation, legal, or operational reasons. The applicable retention rules are described in the Privacy Policy and related legal documentation.",
    ],
  ];

  return (
    <main className="min-h-screen bg-(--background) text-(--foreground)">
      <div className="mx-auto grid min-h-screen max-w-375 lg:grid-cols-[0.34fr_0.66fr]">
        <aside className="relative overflow-hidden bg-(--surface-inverse) px-6 py-8 text-white sm:px-10 lg:min-h-screen lg:px-12">
          <div className="absolute -bottom-20 -right-20 h-80 w-80 rounded-full border border-white/10" aria-hidden="true" />
          <div className="relative z-10 flex h-full flex-col">
            <div className="flex items-center justify-between">
              <Link href="/" className="inline-flex items-center gap-3 text-sm font-black text-white">
                <span className="grid h-11 w-11 -rotate-6 place-items-center rounded-xl bg-(--brand-primary-soft) text-xs font-black text-(--brand-primary-dark)">
                  H!
                </span>
                Hi!Book
              </Link>
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/35">Data / 01</span>
            </div>

            <div className="my-auto py-16">
              <Database className="h-8 w-8 text-(--brand-accent)" aria-hidden="true" />
              <p className="mt-10 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-(--brand-accent)">
                Information / protection
              </p>
              <h1 className="mt-5 text-5xl font-black leading-[0.9] tracking-[-0.07em] xl:text-7xl">
                Behind the
                <br />
                profile.
              </h1>
              <p className="mt-7 max-w-sm text-sm leading-6 text-white/65">
                A plain-language map of how information moves through the service.
              </p>
            </div>

            <Link href="/" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-white/60 transition hover:text-white">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back home
            </Link>
          </div>
        </aside>

        <article className="bg-[var(--surface)] px-6 py-10 sm:px-10 sm:py-14 lg:px-16 xl:px-24">
          <header className="flex items-center justify-between border-b border-[var(--divider)] pb-6">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-(--brand-primary-dark)">Data Protection &amp; Usage</p>
              <p className="mt-2 text-xs text-(--muted)">Version 1.0 · Initial draft</p>
            </div>
            <LockKeyhole className="h-5 w-5 text-(--muted)" aria-hidden="true" />
          </header>

          <div className="py-12">
            <p className="max-w-3xl text-3xl font-black leading-tight tracking-[-0.055em] sm:text-5xl">
              The product is social on the surface. Information management sits underneath it.
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

            <div className="mt-8 grid gap-3 sm:grid-cols-[1fr_auto]">
              <div className="border-l-2 border-(--brand-accent) bg-(--surface-secondary) p-5">
                <p className="text-xs font-black uppercase tracking-[0.15em] text-(--foreground)">Draft status</p>
                <p className="mt-2 text-sm leading-6 text-(--text-secondary)">
                  This is the application&apos;s initial policy presentation and requires legal review before production publication. It is not a substitute for jurisdiction-specific legal advice.
                </p>
              </div>
              <div className="flex items-center gap-2 border border-(--divider) px-5 py-3 text-xs font-bold text-(--muted)">
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                Controls built in
              </div>
            </div>
          </div>

          <nav className="flex flex-wrap gap-x-7 gap-y-3 border-t border-(--divider) pt-6 text-xs font-bold">
            <Link href="/privacy" className="hover:text-(--brand-primary-dark)">Privacy</Link>
            <Link href="/terms" className="hover:text-(--brand-primary-dark)">Terms</Link>
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
