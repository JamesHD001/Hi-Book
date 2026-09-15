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

      <footer className="hb-footer">
        <span>© {new Date().getFullYear()} Hi!Book. Connect beyond distance.</span>
      </footer>
    </main>
  );
}
