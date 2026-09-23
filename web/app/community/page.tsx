import Link from "next/link";
import { Compass, MessageCircle, Bell, UserRound, ArrowUpRight } from "lucide-react";
import { requireActiveUser } from "@/lib/auth/require-active-user";
import CreatePost from "@/components/community/CreatePost";
import PostFeed from "@/components/feed/PostFeed";

export const dynamic = "force-dynamic";

export default async function CommunityPage() {
  const { supabase, user } = await requireActiveUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, username")
    .eq("user_id", user.id)
    .maybeSingle();

  const displayName = profile?.display_name ?? "friend";

  return (
    <main className="hb-community-page">
      <section className="hb-community-hero" aria-labelledby="community-page-title">
        <div className="hb-community-hero__inner">
          <div className="hb-community-hero__copy">
            <p className="hb-eyebrow">
              <span className="hb-status-dot" aria-hidden="true" />
              Your community
            </p>
            <h1 id="community-page-title" className="hb-title-1">
              Welcome, {displayName}.
            </h1>
            <p className="hb-lede">
              Share what matters, discover different perspectives, and build
              genuine connections across the world.
            </p>
            {profile?.username && (
              <p className="hb-badge hb-badge--brand">
                @{profile.username}
              </p>
            )}
          </div>

          <nav className="hb-shortcut-grid" aria-label="Community shortcuts">
            <Link href="/discover" className="hb-shortcut">
              <span className="hb-tile hb-tile--brand" aria-hidden="true">
                <Compass size={18} />
              </span>
              <span className="hb-shortcut__body">
                <strong>Discover</strong>
                <span>Meet new people</span>
              </span>
              <ArrowUpRight size={16} aria-hidden="true" />
            </Link>

            <Link href="/messages" className="hb-shortcut">
              <span className="hb-tile" aria-hidden="true">
                <MessageCircle size={18} />
              </span>
              <span className="hb-shortcut__body">
                <strong>Messages</strong>
                <span>Keep conversations going</span>
              </span>
              <ArrowUpRight size={16} aria-hidden="true" />
            </Link>

            <Link href="/profile" className="hb-shortcut">
              <span className="hb-tile" aria-hidden="true">
                <UserRound size={18} />
              </span>
              <span className="hb-shortcut__body">
                <strong>Profile</strong>
                <span>Shape your presence</span>
              </span>
              <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </nav>
        </div>
      </section>

      <div className="hb-page-shell hb-page-shell--wide hb-community-layout">
        <div className="hb-community-main">
          <CreatePost />
          <PostFeed />
        </div>

        <aside className="hb-community-sidebar">
          <section className="hb-card">
            <div className="hb-card__header">
              <div>
                <p className="hb-eyebrow hb-eyebrow--muted">Stay connected</p>
                <h2 className="hb-title-3">Your Hi!Book shortcuts</h2>
              </div>
              <span className="hb-tile hb-tile--brand" aria-hidden="true">
                <ArrowUpRight size={17} />
              </span>
            </div>

            <div className="hb-card__body hb-shortcut-list">
              <Link href="/discover" className="hb-list__row hb-list__row--link">
                <span className="hb-tile hb-tile--brand" aria-hidden="true">
                  <Compass size={17} />
                </span>
                <span className="hb-list__body">
                  <span className="hb-list__title">Discover people</span>
                  <span className="hb-list__meta">
                    Explore languages, interests, and perspectives.
                  </span>
                </span>
              </Link>

              <Link href="/messages" className="hb-list__row hb-list__row--link">
                <span className="hb-tile" aria-hidden="true">
                  <MessageCircle size={17} />
                </span>
                <span className="hb-list__body">
                  <span className="hb-list__title">Private messages</span>
                  <span className="hb-list__meta">
                    Have one-to-one conversations with your connections.
                  </span>
                </span>
              </Link>

              <Link
                href="/notifications"
                className="hb-list__row hb-list__row--link"
              >
                <span className="hb-tile hb-tile--success" aria-hidden="true">
                  <Bell size={17} />
                </span>
                <span className="hb-list__body">
                  <span className="hb-list__title">Notifications</span>
                  <span className="hb-list__meta">
                    Keep up with activity and account updates.
                  </span>
                </span>
              </Link>

              <Link href="/profile" className="hb-list__row hb-list__row--link">
                <span className="hb-tile" aria-hidden="true">
                  <UserRound size={17} />
                </span>
                <span className="hb-list__body">
                  <span className="hb-list__title">Your profile</span>
                  <span className="hb-list__meta">
                    Manage what you choose to share.
                  </span>
                </span>
              </Link>
            </div>
          </section>

          <section className="hb-panel hb-panel--inverse">
            <p className="hb-eyebrow hb-eyebrow--on-inverse">
              A better way to connect
            </p>
            <h2 className="hb-title-3 hb-on-inverse">
              Different backgrounds. Shared humanity.
            </h2>
            <p className="hb-lede">
              Hi!Book is designed to help people discover one another without
              asking everyone to be the same.
            </p>
          </section>
        </aside>
      </div>
    </main>
  );
}
