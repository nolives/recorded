import type { Metadata } from "next";
import Link from "next/link";
import { AlbumCover } from "@/components/album-cover";
import { DiaryFiltersBar } from "@/components/diary-filters";
import { RelistenPicker } from "@/components/relisten-picker";
import { ScoreBadge } from "@/components/score-badge";
import { StarIcon } from "@/components/star-icon";
import { readFilters, titleOrArtistFilter, type Sort } from "@/lib/diary-filters";
import { formatListenDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Diary · Recorded" };

// For each sort: which column decides the order first, and in which
// direction. Unscored listens always go last when sorting by score.
const ORDER: Record<Sort, { column: "listened_on" | "score"; ascending: boolean }> = {
  newest: { column: "listened_on", ascending: false },
  oldest: { column: "listened_on", ascending: true },
  score_high: { column: "score", ascending: false },
  score_low: { column: "score", ascending: true },
};

export default async function DiaryPage({ searchParams }: PageProps<"/diary">) {
  const filters = readFilters(await searchParams);
  const supabase = await createClient();

  // The listens that match. "!inner" means a listen only comes back if its
  // album passes the album filters (search and genre).
  let query = supabase
    .from("listens")
    .select("id, listened_on, score, albums!inner (id, title, artist, release_year, cover_url, genre)");
  if (filters.q) {
    query = query.or(titleOrArtistFilter(filters.q), { referencedTable: "albums" });
  }
  if (filters.genre) {
    query = query.eq("albums.genre", filters.genre);
  }
  const order = ORDER[filters.sort];
  query = query.order(order.column, { ascending: order.ascending, nullsFirst: false });
  if (order.column === "score") {
    // Same score: newest first.
    query = query.order("listened_on", { ascending: false });
  }
  query = query.order("created_at", { ascending: order.column === "listened_on" && order.ascending });

  // Row Level Security only returns the signed-in user's own listens and
  // stars. The second query is every listen's genre, for the genre menu
  // and the total count.
  const [{ data: listens, error }, { data: stars }, { data: everything }] = await Promise.all([
    query,
    supabase.from("stars").select("album_id"),
    supabase.from("listens").select("albums (genre)"),
  ]);
  const favoriteIds = new Set((stars ?? []).map((star) => star.album_id));

  const total = everything?.length ?? 0;
  const genres = [
    ...new Set(
      (everything ?? []).flatMap((listen) => (listen.albums?.genre ? [listen.albums.genre] : [])),
    ),
  ].sort((a, b) => a.localeCompare(b));
  // Keep a genre from the address in the menu even if it's no longer in
  // the diary, so the menu shows what's being filtered.
  if (filters.genre && !genres.includes(filters.genre)) genres.unshift(filters.genre);

  const searching = Boolean(filters.q || filters.genre);
  const shown = listens?.length ?? 0;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Your diary</h1>
          {total > 0 ? (
            <p className="mt-1 text-sm text-muted">
              {searching
                ? `Showing ${shown} of ${total} ${total === 1 ? "listen" : "listens"}`
                : `${total} ${total === 1 ? "listen" : "listens"}`}
            </p>
          ) : null}
        </div>
        <Link
          href="/listens/new"
          className="rounded-md bg-accent px-4 py-2 font-semibold text-background hover:opacity-90"
        >
          Log a listen
        </Link>
      </div>

      {total > 0 ? <RelistenPicker /> : null}
      {total > 0 ? <DiaryFiltersBar filters={filters} genres={genres} /> : null}

      {error ? (
        <p role="alert" className="text-danger">
          We couldn&apos;t load your diary. Refresh to try again.
        </p>
      ) : total > 0 && shown === 0 ? (
        <div className="rounded-lg border border-dashed border-line px-6 py-12 text-center">
          <p className="font-medium">No listens match</p>
          <p className="mt-1 text-sm text-muted">
            {filters.q ? <>Nothing for &ldquo;{filters.q}&rdquo;{filters.genre ? ` in ${filters.genre}` : ""}. </> : null}
            Try another search, or{" "}
            <Link href="/diary" className="text-accent hover:underline">
              show everything
            </Link>
            .
          </p>
        </div>
      ) : !listens || listens.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line px-6 py-12 text-center">
          <p className="font-medium">No listens yet</p>
          <p className="mt-1 text-sm text-muted">
            Log the last album you listened to, and it will show up here.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-line rounded-lg border border-line">
          {listens.map((listen) => {
            const album = listen.albums;
            if (!album) return null;
            return (
              <li key={listen.id}>
                <Link
                  href={`/listens/${listen.id}`}
                  className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-surface"
                >
                  <AlbumCover title={album.title} artist={album.artist} coverUrl={album.cover_url} />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 font-medium">
                      <span className="truncate">{album.title}</span>
                      {favoriteIds.has(album.id) ? (
                        <>
                          <StarIcon filled className="size-3.5 shrink-0 text-accent" />
                          <span className="sr-only">(favorite)</span>
                        </>
                      ) : null}
                    </p>
                    <p className="truncate text-sm text-muted">
                      {album.artist}
                      {album.release_year ? ` · ${album.release_year}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <ScoreBadge score={listen.score} />
                    <span className="text-xs text-muted">{formatListenDate(listen.listened_on)}</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
