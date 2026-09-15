import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Compass,
  Globe2,
  HeartHandshake,
  MessageCircle,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const features = [
  {
    number: "01",
    icon: Globe2,
    title: "Discover globally",
    description:
      "Find people, interests, languages, and perspectives from places and communities beyond your immediate circle.",
    tone: "blue",
  },
  {
    number: "02",
    icon: MessageCircle,
    title: "Connect with intention",
    description:
      "Follow people, join conversations, and build meaningful connections without losing control of your experience.",
    tone: "coral",
  },
  {
    number: "03",
    icon: ShieldCheck,
    title: "Designed with safety in mind",
    description:
      "Privacy, blocking, reporting, permissions, and account controls are built into the platform from the foundation up.",
    tone: "green",
  },
];

export default function HomePage() {
  return (
    <main className="hb-page">
      <nav className="hb-nav" aria-label="Primary navigation">
        <Link href="/" className="hb-brand" aria-label="Hi!Book home">
          <span className="hb-brand-mark" aria-hidden="true">H!</span>
          <span>Hi!Book</span>
        </Link>

        <div className="hb-nav-links">
          <a className="hb-nav-link" href="#why-hibook">Why Hi!Book</a>
          <a className="hb-nav-link" href="#community">Community</a>
        </div>

        <div className="hb-nav-actions">
          <Link href="/login" className="hb-nav-signin">Sign in</Link>
          <Link href="/signup" className="hb-button hb-button-dark">
            Join Hi!Book <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </nav>

      <section className="hb-hero" aria-labelledby="hero-title">
        <div className="hb-hero-grid">
          <div className="hb-hero-copy-wrap">
            <div className="hb-editorial-label">
              <span>HB / 00</span>
              <span className="hb-label-line" aria-hidden="true" />
              <span>Global social network</span>
            </div>

            <h1 id="hero-title" className="hb-hero-title">
              Your world is bigger than your <em>usual circle.</em>
            </h1>

            <p className="hb-hero-copy">
              Hi!Book is a global social network built around genuine human
              connection. Discover different perspectives, share your world,
              and connect across countries, cultures, languages, and backgrounds.
            </p>

            <div className="hb-hero-actions">
              <Link href="/signup" className="hb-button hb-button-dark hb-button-large">
                Create your account <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <Link href="/login" className="hb-text-link">
                I already have an account <ArrowUpRight size={15} aria-hidden="true" />
              </Link>
            </div>

            <div className="hb-proof-row" aria-label="Platform highlights">
              <span><span className="hb-proof-mark" aria-hidden="true">+</span> Global community</span>
              <span><span className="hb-proof-mark" aria-hidden="true">+</span> Privacy controls</span>
              <span><span className="hb-proof-mark" aria-hidden="true">+</span> Built for people</span>
            </div>
          </div>

          <div className="hb-hero-art" aria-label="Illustration of the Hi!Book experience">
            <div className="hb-art-ring hb-art-ring-one" aria-hidden="true" />
            <div className="hb-art-ring hb-art-ring-two" aria-hidden="true" />
            <div className="hb-art-dot hb-art-dot-one" aria-hidden="true" />
            <div className="hb-art-dot hb-art-dot-two" aria-hidden="true" />

            <div className="hb-world-card">
              <div className="hb-world-topline">
                <span>01 / DISCOVER</span>
                <Compass size={17} aria-hidden="true" />
              </div>
              <div className="hb-world-title">Different places.<br />Shared interests.</div>
              <div className="hb-world-map" aria-hidden="true">
                <span className="hb-map-orbit hb-map-orbit-a" />
                <span className="hb-map-orbit hb-map-orbit-b" />
                <span className="hb-map-point hb-map-point-a" />
                <span className="hb-map-point hb-map-point-b" />
                <span className="hb-map-point hb-map-point-c" />
                <span className="hb-map-point hb-map-point-d" />
              </div>
              <div className="hb-world-footer">
                <span>People are not places on a map.</span>
                <strong>They&apos;re stories.</strong>
              </div>
            </div>

            <div className="hb-profile-card">
              <div className="hb-profile-head">
                <div className="hb-avatar" aria-hidden="true">AM</div>
                <div>
                  <div className="hb-profile-name">Amina M.</div>
                  <div className="hb-profile-meta">Lagos · Exploring the world</div>
                </div>
              </div>
              <p className="hb-profile-quote">
                “There is always something new to learn from another person.”
              </p>
              <div className="hb-tags" aria-label="Interests">
                <span>Photography</span><span>Languages</span><span>Travel</span>
              </div>
            </div>

            <div className="hb-connection-note">
              <HeartHandshake size={18} aria-hidden="true" />
              <span>Make room for people.</span>
            </div>
          </div>
        </div>
      </section>

      <section id="why-hibook" className="hb-section hb-section-features" aria-labelledby="why-title">
        <div className="hb-section-intro">
          <div className="hb-editorial-label">
            <span>HB / 01</span>
            <span className="hb-label-line" aria-hidden="true" />
            <span>Why Hi!Book</span>
          </div>
          <h2 id="why-title" className="hb-section-title">
            A social experience with <em>people</em> at the center.
          </h2>
          <p className="hb-section-copy">
            The goal is simple: make it easier to discover people who are
            different from you, communicate naturally, and decide how you want
            to participate.
          </p>
        </div>

        <div className="hb-feature-grid">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <article className={`hb-feature hb-feature-${feature.tone}`} key={feature.title}>
                <div className="hb-feature-topline">
                  <span>{feature.number}</span>
                  <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
                <span className="hb-feature-arrow" aria-hidden="true"><ArrowUpRight size={18} /></span>
              </article>
            );
          })}
        </div>
      </section>

      <section id="community" className="hb-community" aria-labelledby="community-title">
        <div className="hb-community-inner">
          <div className="hb-editorial-label hb-editorial-label-light">
            <span>HB / 02</span>
            <span className="hb-label-line" aria-hidden="true" />
            <span>Your next connection</span>
          </div>
          <h2 id="community-title">Come as you are.<br /><em>Find your people.</em></h2>
          <p>
            Create your profile, share what matters to you, and start building
            your own corner of the Hi!Book community.
          </p>
          <div className="hb-community-actions">
            <Link href="/signup" className="hb-button hb-button-light hb-button-large">
              Get started <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <Link href="/login" className="hb-community-link">
              Sign in <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
          </div>
        </div>
        <div className="hb-community-geometry" aria-hidden="true">
          <span /><span /><span />
        </div>
      </section>

      <footer className="hb-footer">
        <div className="hb-footer-grid">
          <div className="hb-footer-brand">
            <Link href="/" className="hb-brand" aria-label="Hi!Book home">
              <span className="hb-brand-mark" aria-hidden="true">H!</span>
              <span>Hi!Book</span>
            </Link>
            <p>A social network built around genuine human connection, discovery, and user control.</p>
            <span className="hb-footer-motto">Connect beyond distance.</span>
          </div>

          <div className="hb-footer-column">
            <h2>Explore</h2>
            <Link href="#why-hibook">Why Hi!Book</Link>
            <Link href="#community">Community</Link>
            <Link href="/signup">Create an account</Link>
            <Link href="/login">Sign in</Link>
          </div>

          <div className="hb-footer-column">
            <h2>Safety &amp; legal</h2>
            <Link href="/community-guidelines">Community Guidelines</Link>
            <Link href="/terms">Terms of Use</Link>
            <Link href="/privacy">Privacy Policy</Link>
            <Link href="/data-protection">Data Protection &amp; Usage</Link>
          </div>

          <div className="hb-footer-cta">
            <Sparkles size={18} aria-hidden="true" />
            <span>READY TO CONNECT?</span>
            <h2>Build your corner of the community.</h2>
            <Link href="/signup">Join Hi!Book <ArrowUpRight size={15} aria-hidden="true" /></Link>
          </div>
        </div>
        <div className="hb-footer-bottom">
          <span>© {new Date().getFullYear()} Hi!Book. All rights reserved.</span>
          <span>Designed for people, privacy, and meaningful connection.</span>
        </div>
      </footer>
    </main>
  );
}
