import Link from "next/link";
import { Compass, Globe2, Languages, Settings2 } from "lucide-react";
import DiscoverPeopleList from "@/components/discover/DiscoverPeopleList";
import { requireActiveUser } from "@/lib/auth/require-active-user";

export const dynamic = "force-dynamic";

type DiscoveryPerson = {
  user_id: string;
  username: string;
  display_name: string;
  bio: string | null;
  avatar_path: string | null;
  country_code: string | null;
  shared_interest_count: number;
  shared_language_count: number;
  avatar_url?: string | null;
};

export default async function DiscoverPage() {
  const { supabase } = await requireActiveUser();
  const { data, error } = await supabase.rpc("discover_people", {
    candidate_limit: 20,
  });
  const people = (data ?? []) as DiscoveryPerson[];

  const avatarPaths = Array.from(
    new Set(
      people
        .map((person) => person.avatar_path)
        .filter((path): path is string => Boolean(path)),
    ),
  );

  const { data: avatarUrls } = avatarPaths.length
    ? await supabase.storage.from("avatars").createSignedUrls(avatarPaths, 600)
    : { data: [] };

  const avatarMap = new Map(
    (avatarUrls ?? []).map((item) => [item.path, item.signedUrl]),
  );

  const withAvatars = people.map((person) => ({
    ...person,
    avatar_url: person.avatar_path
      ? avatarMap.get(person.avatar_path) ?? null
      : null,
  }));

  return (
    <main className="hb-page">
      <section className="hb-page-header hb-page-header--wide">
        <div className="hb-page-header__inner">
          <div className="hb-page-header__main">
            <div className="hb-page-header__body">
              <p className="hb-eyebrow hb-eyebrow--on-inverse">
                <Compass size={14} aria-hidden="true" />
                Global discovery
              </p>
              <h1 className="hb-page-header__title">Meet someone new.</h1>
              <p className="hb-page-header__description">
                Find people through shared interests and languages, with
                discovery shaped by the privacy choices you control.
              </p>
            </div>

            <div className="hb-page-header__aside">
              <Link
                href="/profile"
                className="hb-button hb-button--outline-inverse"
              >
                <Settings2 size={16} aria-hidden="true" />
                Manage my discovery profile
              </Link>
            </div>
          </div>

          <div className="hb-page-header__stats">
            <div className="hb-stat hb-stat--inverse">
              <div className="hb-stat__label">
                <Globe2 size={14} aria-hidden="true" />
                Shared interests
              </div>
              <div className="hb-stat__hint">
                Connect around topics you both care about.
              </div>
            </div>
            <div className="hb-stat hb-stat--inverse">
              <div className="hb-stat__label">
                <Languages size={14} aria-hidden="true" />
                Shared languages
              </div>
              <div className="hb-stat__hint">
                Make meaningful conversations easier to start.
              </div>
            </div>
            <div className="hb-stat hb-stat--inverse">
              <div className="hb-stat__label">Privacy aware</div>
              <div className="hb-stat__hint">
                Only eligible profiles appear in discovery.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="hb-page-shell hb-page-shell--wide">
        <div className="hb-section__head">
          <div>
            <p className="hb-eyebrow">Recommended connections</p>
            <h2 className="hb-section__title">
              People you might connect with
            </h2>
          </div>

          <div className="hb-actions">
            <p className="hb-meta" aria-live="polite">
              {people.length} profile{people.length === 1 ? "" : "s"} in this
              discovery set
            </p>
            <Link
              href="/profile"
              className="hb-button hb-button--secondary hb-button--sm"
            >
              Edit profile
            </Link>
          </div>
        </div>

        {error ? (
          <div className="hb-status hb-status--error" role="alert">
            <strong className="hb-status__title">
              Discovery is temporarily unavailable.
            </strong>
            <p className="hb-status__text">
              We couldn’t load recommendations right now. Please refresh the
              page and try again.
            </p>
          </div>
        ) : (
          <DiscoverPeopleList people={withAvatars} />
        )}
      </section>
    </main>
  );
}
