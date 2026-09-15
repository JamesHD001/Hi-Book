import Link from "next/link";

const features = [
  {
    icon: "◎",
    title: "Discover globally",
    description:
      "Find people, interests, languages, and perspectives from places and communities beyond your immediate circle.",
  },
  {
    icon: "◇",
    title: "Connect with intention",
    description:
      "Follow people, join conversations, and build meaningful connections without losing control of your experience.",
  },
  {
    icon: "✓",
    title: "Designed with safety in mind",
    description:
      "Privacy, blocking, reporting, permissions, and account controls are built into the platform from the foundation up.",
  },
];

export default function HomePage() {
  return (
    <main className="hb-page">
      <nav className="hb-nav" aria-label="Primary navigation">
        <Link href="/" className="hb-brand" aria-label="Hi!Book home">
          <span className="hb-brand-mark" aria-hidden="true">
            H!
          </span>
          <span>Hi!Book</span>
        </Link>

        <div className="hb-nav-links">
          <a className="hb-nav-link" href="#why-hibook">
            Why Hi!Book
          </a>
          <a className="hb-nav-link" href="#community">
            Community
          </a>
        </div>

        <div className="hb-nav-actions">
          <Link href="/login" className="hb-button hb-button-secondary">
            Sign in
          </Link>
          <Link href="/signup" className="hb-button hb-button-primary">
            Join Hi!Book
          </Link>
        </div>
      </nav>

      <section className="hb-hero" aria-labelledby="hero-title">
        <div className="hb-hero-grid">
          <div>
            <span className="hb-eyebrow">
              <span className="hb-eyebrow-dot" aria-hidden="true" />
              Hi!Book 2.0
            </span>

            <h1 id="hero-title" className="hb-hero-title">
              Meet people beyond your{" "}
              <span className="hb-gradient-text">usual circle.</span>
            </h1>

            <p className="hb-hero-copy">
              Hi!Book is a global social network built around genuine human
              connection. Discover different perspectives, share your world,
              and connect across countries, cultures, languages, and
              backgrounds.
            </p>

            <div className="hb-hero-actions">
              <Link href="/signup" className="hb-button hb-button-primary">
                Create your account <span aria-hidden="true">→</span>
              </Link>
              <Link href="/login" className="hb-button hb-button-secondary">
                I already have an account
              </Link>
            </div>

            <div className="hb-trust-row" aria-label="Platform highlights">
              <span className="hb-trust-item">Global community</span>
              <span className="hb-trust-item">Privacy controls</span>
              <span className="hb-trust-item">Built for real people</span>
            </div>
          </div>

          <div className="hb-visual" aria-label="Preview of the Hi!Book experience">
            <div className="hb-orbit" aria-hidden="true" />

            <article className="hb-card hb-profile-card">
              <div className="hb-profile-head">
                <div className="hb-avatar" aria-hidden="true">
                  AM
                </div>
                <div>
                  <div className="hb-profile-name">Amina M.</div>
                  <div className="hb-profile-meta">Lagos · Exploring the world</div>
                </div>
              </div>
              <p className="hb-card-copy">
                “I love discovering how other people see the world. There is
                always something new to learn.”
              </p>
              <div className="hb-tags" aria-label="Interests">
                <span className="hb-tag">Photography</span>
                <span className="hb-tag">Languages</span>
                <span className="hb-tag">Travel</span>
              </div>
            </article>

            <article className="hb-card hb-discovery-card">
              <div className="hb-card-label">Discover people</div>
              <div className="hb-discovery-title">Different places. Shared interests.</div>
              <div className="hb-mini-profiles" aria-hidden="true">
                <span className="hb-mini-avatar">JK</span>
                <span className="hb-mini-avatar">RA</span>
                <span className="hb-mini-avatar">MO</span>
                <span className="hb-mini-avatar">+8</span>
              </div>
            </article>

            <article className="hb-card hb-stat-card">
              <span className="hb-stat-icon" aria-hidden="true">✓</span>
              <div>
                <div className="hb-stat-value">Your space, your rules</div>
                <div className="hb-stat-label">Privacy and connection controls</div>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section id="why-hibook" className="hb-section" aria-labelledby="why-title">
        <div className="hb-section-heading">
          <div className="hb-section-kicker">Why Hi!Book</div>
          <h2 id="why-title" className="hb-section-title">
            A social experience with people at the center.
          </h2>
          <p className="hb-section-copy">
            The goal is simple: make it easier to discover people who are
            different from you, communicate naturally, and decide how you want
            to participate.
          </p>
        </div>

        <div className="hb-feature-grid">
          {features.map((feature) => (
            <article className="hb-feature" key={feature.title}>
              <div className="hb-feature-icon" aria-hidden="true">
                {feature.icon}
              </div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="community" className="hb-section" aria-labelledby="community-title">
        <div className="hb-section-heading">
          <div className="hb-section-kicker">Your next connection</div>
          <h2 id="community-title" className="hb-section-title">
            Come as you are. Find your people.
          </h2>
          <p className="hb-section-copy">
            Create your profile, share what matters to you, and start building
            your own corner of the Hi!Book community.
          </p>
          <div className="hb-hero-actions">
            <Link href="/signup" className="hb-button hb-button-primary">
              Get started
            </Link>
            <Link href="/login" className="hb-button hb-button-secondary">
              Sign in
            </Link>
          </div>
        </div>
      </section>

      <footer className="relative mt-8 overflow-hidden bg-slate-950 text-slate-300">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(49,94,251,0.24),transparent_32%),radial-gradient(circle_at_85%_20%,rgba(139,92,246,0.2),transparent_28%)]"
        />

        <div className="relative mx-auto w-[min(1180px,calc(100%-40px))] py-14 sm:py-16">
          <div className="grid gap-12 lg:grid-cols-[1.5fr_1fr_1fr_1.15fr]">
            <div className="max-w-sm">
              <Link href="/" className="inline-flex items-center gap-3" aria-label="Hi!Book home">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-blue-500 to-violet-500 text-sm font-black text-white shadow-lg shadow-blue-950/40">
                  H!
                </span>
                <span className="text-xl font-extrabold tracking-tight text-white">Hi!Book</span>
              </Link>
              <p className="mt-5 text-sm leading-7 text-slate-400">
                A social network built around genuine human connection,
                discovery, and user control.
              </p>
              <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Connect beyond distance.
              </p>
            </div>

            <div>
              <h2 className="text-xs font-extrabold uppercase tracking-[0.16em] text-white">
                Explore
              </h2>
              <nav className="mt-5 flex flex-col items-start gap-3" aria-label="Explore links">
                <a className="text-sm text-slate-400 transition hover:text-white" href="#why-hibook">
                  Why Hi!Book
                </a>
                <a className="text-sm text-slate-400 transition hover:text-white" href="#community">
                  Community
                </a>
                <Link className="text-sm text-slate-400 transition hover:text-white" href="/signup">
                  Create an account
                </Link>
                <Link className="text-sm text-slate-400 transition hover:text-white" href="/login">
                  Sign in
                </Link>
              </nav>
            </div>

            <div>
              <h2 className="text-xs font-extrabold uppercase tracking-[0.16em] text-white">
                Safety &amp; legal
              </h2>
              <nav className="mt-5 flex flex-col items-start gap-3" aria-label="Safety and legal links">
                <Link className="text-sm text-slate-400 transition hover:text-white" href="/community-guidelines">
                  Community Guidelines
                </Link>
                <Link className="text-sm text-slate-400 transition hover:text-white" href="/terms">
                  Terms of Use
                </Link>
                <Link className="text-sm text-slate-400 transition hover:text-white" href="/privacy">
                  Privacy Policy
                </Link>
                <Link className="text-sm text-slate-400 transition hover:text-white" href="/data-protection">
                  Data Protection &amp; Usage
                </Link>
              </nav>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 shadow-2xl shadow-black/20 backdrop-blur-sm">
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-blue-300">
                Ready to connect?
              </p>
              <h2 className="mt-3 text-lg font-extrabold tracking-tight text-white">
                Build your corner of the community.
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Create your profile and start discovering people beyond your usual circle.
              </p>
              <Link
                href="/signup"
                className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-white px-4 text-sm font-extrabold text-slate-950 transition hover:-translate-y-0.5 hover:bg-slate-100"
              >
                Join Hi!Book
              </Link>
            </div>
          </div>

          <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <span>© {new Date().getFullYear()} Hi!Book. All rights reserved.</span>
            <span>Designed for people, privacy, and meaningful connection.</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
