import type { Metadata } from "next";
import Link from "next/link";
import { AlbumCover } from "@/components/album-cover";
import { StarButton } from "@/components/star-button";
import { averageScore } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Favorites · Recorded" };

// "Logged 3 times · average 8.3", "Logged once · 9/10", and so on.
function summary(listens: { score: number | null }[]) {
  if (listens.length === 0) return "Not in your diary right now";
  const times = listens.length === 1 ? "Logged once" : `Logged ${listens.length} times`;
  const average = averageScore(listens.map((listen) => listen.score));
  if (average === null) return times;
  return listens.length === 1 ? `${times} · ${average}/10` : `${times} · average ${average}`;
}

export default async function FavoritesPage() {
  const supabase = await createClient();

  // Stars joined to their albums, and each album's listens. Row Level
  // Security only returns the signed-in user's own stars and listens.
  const { data: stars, error } = await supabase
    .from("stars")
    .select("created_at, albums (id, title, artist, release_year, cover_url, listens (id, listened_on, score))")
    .order("created_at", { ascending: false });

  const favorites = (stars ?? []).flatMap((star) => (star.albums ? [star.albums] : []));

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Favorites</h1>
        <p className="mt-1 text-sm text-muted">
          {favorites.length > 0
            ? `${favorites.length} all-time ${favorites.length === 1 ? "favorite" : "favorites"}`
            : "Your all-time favorite albums"}
        </p>
      </div>

      {error ? (
        <p role="alert" className="text-danger">
          We couldn&apos;t load your favorites. Refresh to try again.
        </p>
      ) : favorites.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line px-6 py-12 text-center">
          <p className="font-medium">No favorites yet</p>
          <p className="mt-1 text-sm text-muted">
            Open any listen in your{" "}
            <Link href="/diary" className="text-accent hover:underline">
              diary
            </Link>{" "}
            and press <span className="text-foreground">Favorite</span> to add the album here.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
          {favorites.map((album) => {
            // Link to the most recent time you logged it.
            const latest = [...album.listens].sort((a, b) =>
              b.listened_on.localeCompare(a.listened_on) || b.id - a.id,
            )[0];
            const details = (
              <>
                <AlbumCover title={album.title} artist={album.artist} coverUrl={album.cover_url} size="fill" />
                <p className="mt-2 truncate font-medium transition-colors group-hover:text-accent">{album.title}</p>
                <p className="truncate text-sm text-muted">
                  {album.artist}
                  {album.release_year ? ` · ${album.release_year}` : ""}
                </p>
                <p className="mt-1 text-xs text-muted">{summary(album.listens)}</p>
              </>
            );

            return (
              <li key={album.id} className="relative min-w-0">
                {latest ? (
                  <Link href={`/listens/${latest.id}`} className="group block">
                    {details}
                  </Link>
                ) : (
                  <div>{details}</div>
                )}
                <div className="absolute right-2 top-2">
                  <StarButton albumId={album.id} albumTitle={album.title} starred variant="icon" />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
