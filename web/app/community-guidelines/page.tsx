import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Flag, HeartHandshake, ShieldAlert } from "lucide-react";

const sections = [
  [
    "01",
    "Treat people with respect",
    "Hi!Book is intended for genuine human connection. Do not use the platform to harass, threaten, intimidate, or deliberately target other people.",
  ],
  [
    "02",
    "Keep interactions safe",
    "Do not use Hi!Book for harmful, illegal, deceptive, or abusive activity. Respect other users' boundaries, privacy, and consent.",
  ],
  [
    "03",
    "Use reporting and blocking tools",
    "If another user or piece of content violates these guidelines, use the available reporting and blocking controls. Reports may be reviewed through Hi!Book's moderation processes.",
  ],
  [
    "04",
    "Moderation",
    "Hi!Book may remove content or restrict accounts when necessary to protect users, enforce platform rules, or comply with applicable requirements. Moderation decisions may be subject to the platform's appeal process where available.",
  ],
];

export default function CommunityGuidelinesPage() {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto grid min-h-screen max-w-[1500px] lg:grid-cols-[0.34fr_0.66fr]">
        <aside className="relative overflow-hidden bg-[var(--surface-inverse)] px-6 py-8 text-white sm:px-10 lg:min-h-screen lg:px-12">
          <div className="relative z-10 flex h-full flex-col">
            <div className="flex items-center justify-between">
              <Link href="/" className="inline-flex items-center gap-3 text-sm font-black text-white">
                <span className="grid h-11 w-11 rotate-[5deg] place-items-center rounded-xl bg-[var(--brand-primary-soft)] text-xs font-black text-[var(--brand-primary-dark)]">
                  H!
                </span>
                Hi!Book
              </Link>
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/35">Safety / 01</span>
            </div>

            <div className="my-auto py-16">
              <HeartHandshake className="h-8 w-8 text-(--brand-accent)" aria-hidden="true" />
              <p className="mt-10 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-(--brand-accent)">
                Community / safety
              </p>
              <h1 className="mt-5 text-5xl font-black leading-[0.9] tracking-[-0.07em] xl:text-7xl">
                Make room
                <br />
                for people.
              </h1>
              <p className="mt-7 max-w-sm text-sm leading-6 text-white/65">
                The shared expectations for participating in Hi!Book — and what to do when something goes wrong.
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
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--brand-primary-dark)]">Community Guidelines</p>
              <p className="mt-2 text-xs text-[var(--muted)]">Version 1.0 · Initial draft</p>
            </div>
            <ShieldAlert className="h-5 w-5 text-[var(--muted)]" aria-hidden="true" />
          </header>

          <div className="py-12">
            <p className="max-w-3xl text-3xl font-black leading-tight tracking-[-0.055em] sm:text-5xl">
              Connection needs boundaries. These are the ones we expect people to respect.
            </p>

            <div className="mt-12 divide-y divide-[var(--divider)] border-y border-[var(--divider)]">
              {sections.map(([number, title, text]) => (
                <section key={number} className="grid gap-5 py-8 sm:grid-cols-[54px_0.8fr_1.4fr]">
                  <span className="font-mono text-xs font-bold text-[var(--brand-primary-dark)]">{number}</span>
                  <h2 className="text-lg font-black tracking-tight text-[var(--foreground)]">{title}</h2>
                  <p className="text-sm leading-7 text-[var(--text-secondary)]">{text}</p>
                </section>
              ))}
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <div className="border border-[var(--divider)] bg-[var(--surface-secondary)] p-5">
                <Flag className="h-5 w-5 text-[var(--brand-primary-dark)]" aria-hidden="true" />
                <p className="mt-5 text-sm font-black text-[var(--foreground)]">See something wrong?</p>
                <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
                  Use the reporting and blocking tools available in the product.
                </p>
              </div>

              <div className="border-l-2 border-[var(--brand-primary)] bg-[var(--surface-secondary)] p-5">
                <p className="text-xs font-black uppercase tracking-[0.15em] text-[var(--foreground)]">Draft status</p>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                  These are the application&apos;s initial guidelines and require further policy and legal review before production publication.
                </p>
              </div>
            </div>
          </div>

          <nav className="flex flex-wrap gap-x-7 gap-y-3 border-t border-[var(--divider)] pt-6 text-xs font-bold">
            <Link href="/terms" className="hover:text-[var(--brand-primary-dark)]">Terms</Link>
            <Link href="/privacy" className="hover:text-[var(--brand-primary-dark)]">Privacy</Link>
            <Link href="/data-protection" className="hover:text-[var(--brand-primary-dark)]">Data Protection</Link>
            <Link href="/" className="ml-auto inline-flex items-center gap-1 text-[var(--muted)] hover:text-[var(--foreground)]">
              Home
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </nav>
        </article>
      </div>
    </main>
  );
}
