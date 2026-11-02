import type { Metadata } from "next";
import Link from "next/link";
import { AlbumCover } from "@/components/album-cover";
import { ScoreBadge } from "@/components/score-badge";
import { formatListenDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Diary · Recorded" };

export default async function DiaryPage() {
  const supabase = await createClient();

  // Row Level Security only returns the signed-in user's own listens.
  const { data: listens, error } = await supabase
    .from("listens")
    .select("id, listened_on, score, albums (title, artist, release_year, cover_url)")
    .order("listened_on", { ascending: false })
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Your diary</h1>
          {listens && listens.length > 0 ? (
            <p className="mt-1 text-sm text-muted">
              {listens.length} {listens.length === 1 ? "listen" : "listens"}
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

      {error ? (
        <p role="alert" className="text-danger">
          We couldn&apos;t load your diary. Refresh to try again.
        </p>
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
                    <p className="truncate font-medium">{album.title}</p>
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
