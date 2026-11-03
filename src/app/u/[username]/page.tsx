import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { AlbumCover } from "@/components/album-cover";
import { ScoreBadge } from "@/components/score-badge";
import { formatListenDate } from "@/lib/format";
import { isSharing, isUsername, readShareKey, SHARING } from "@/lib/sharing";
import { dashboardStats } from "@/lib/stats";
import { createClient } from "@/lib/supabase/server";

const RECENT = 10;

// Loads a profile through the database's sharing check. Returns null if it
// doesn't exist OR the viewer isn't allowed to see it, so the two look the
// same to visitors. cache() means the page and its title share one load.
const loadProfile = cache(async (rawUsername: string, key: string | undefined) => {
  const username = rawUsername.toLowerCase();
  if (!isUsername(username)) return null;

  const supabase = await createClient();
  const args = { p_username: username, p_key: key };
  const [profile, listens, favorites] = await Promise.all([
    supabase.rpc("shared_profile", args),
    supabase.rpc("shared_listens", args),
    supabase.rpc("shared_favorites", args),
  ]);
  const owner = profile.data?.[0];
  if (!owner) return null;
  return { profile: owner, listens: listens.data ?? [], favorites: favorites.data ?? [] };
});

export async function generateMetadata({ params, searchParams }: PageProps<"/u/[username]">): Promise<Metadata> {
  const { username } = await params;
  const shared = await loadProfile(username, readShareKey((await searchParams).key));
  if (!shared) return { title: "Not found · Recorded", robots: { index: false } };
  const name = shared.profile.display_name || `@${shared.profile.username}`;
  return {
    title: `${name} · Recorded`,
    // Keep profiles out of search engines; people share them on purpose.
    robots: { index: false, follow: false },
  };
}

export default async function ProfilePage({ params, searchParams }: PageProps<"/u/[username]">) {
  const { username } = await params;
  const shared = await loadProfile(username, readShareKey((await searchParams).key));
  if (!shared) notFound();

  const { profile, listens, favorites } = shared;
  const name = profile.display_name || `@${profile.username}`;
  const stats = dashboardStats(
    listens.map((listen) => ({ listened_on: listen.listened_on, score: listen.score, genre: listen.genre })),
  );
  const recent = listens.slice(0, RECENT);
  const sharing = isSharing(profile.sharing) ? profile.sharing : "private";
  const joined = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(
    new Date(profile.joined_at),
  );

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      {profile.is_owner ? (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-accent/40 bg-accent/10 px-4 py-3 text-sm">
          <p>
            <span className="font-medium">This is your profile.</span>{" "}
            <span className="text-muted">
              {SHARING[sharing].label}: {sharing === "private" ? "only you can see it." : sharing === "link" ? "people with your link can see it." : "anyone can see it."}
            </span>
          </p>
          <Link href="/settings" className="text-accent hover:underline">
            Sharing settings
          </Link>
        </div>
      ) : null}

      <header className="mb-8">
        <h1 className="text-3xl font-semibold">{name}</h1>
        <p className="mt-1 text-muted">
          {profile.display_name ? `@${profile.username} · ` : ""}On Recorded since {joined}
        </p>
        <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-sm">
          <div>
            <dt className="text-muted">Listens</dt>
            <dd className="text-xl font-semibold">{stats.totalListens}</dd>
          </div>
          <div>
            <dt className="text-muted">Average score</dt>
            <dd className="text-xl font-semibold">
              {stats.averageScore ?? "—"}
              {stats.averageScore ? <span className="text-sm font-normal text-muted">/10</span> : null}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-muted">Top genre</dt>
            <dd className="truncate text-xl font-semibold">{stats.topGenre?.name ?? "—"}</dd>
          </div>
        </dl>
      </header>

      {favorites.length > 0 ? (
        <section aria-labelledby="favorites-title" className="mb-10">
          <h2 id="favorites-title" className="mb-3 text-lg font-semibold">
            Favorites
          </h2>
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5">
            {favorites.map((album) => (
              <li key={album.album_id} className="min-w-0">
                <AlbumCover title={album.title} artist={album.artist} coverUrl={album.cover_url} size="fill" />
                <p className="mt-1.5 truncate text-sm font-medium">{album.title}</p>
                <p className="truncate text-xs text-muted">{album.artist}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="recent-title" className="mb-10">
        <h2 id="recent-title" className="mb-3 text-lg font-semibold">
          Recent listens
        </h2>
        {recent.length === 0 ? (
          <p className="text-muted">No listens yet.</p>
        ) : (
          <ul className="divide-y divide-line rounded-lg border border-line">
            {recent.map((listen) => (
              <li key={listen.id} className="flex gap-4 px-4 py-3">
                <AlbumCover title={listen.title} artist={listen.artist} coverUrl={listen.cover_url} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{listen.title}</p>
                      <p className="truncate text-sm text-muted">
                        {listen.artist}
                        {listen.release_year ? ` · ${listen.release_year}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <ScoreBadge score={listen.score} />
                      <span className="text-xs text-muted">{formatListenDate(listen.listened_on)}</span>
                    </div>
                  </div>
                  {listen.review ? (
                    <p className="mt-2 line-clamp-4 whitespace-pre-line text-sm leading-relaxed">{listen.review}</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {listens.length > RECENT ? (
        <section aria-labelledby="diary-title">
          <details>
            <summary id="diary-title" className="cursor-pointer text-lg font-semibold">
              Full diary <span className="text-sm font-normal text-muted">({listens.length} listens)</span>
            </summary>
            <ul className="mt-3 divide-y divide-line rounded-lg border border-line text-sm">
              {listens.map((listen) => (
                <li key={listen.id} className="flex items-center justify-between gap-3 px-4 py-2">
                  <span className="min-w-0 truncate">
                    <span className="font-medium">{listen.title}</span>
                    <span className="text-muted"> · {listen.artist}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-3">
                    <span className="text-xs text-muted">{formatListenDate(listen.listened_on)}</span>
                    <ScoreBadge score={listen.score} />
                  </span>
                </li>
              ))}
            </ul>
          </details>
        </section>
      ) : null}
    </main>
  );
}
