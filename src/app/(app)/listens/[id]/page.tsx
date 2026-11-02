import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlbumCover } from "@/components/album-cover";
import { DeleteListenButton } from "@/components/delete-listen-button";
import { ScoreBadge } from "@/components/score-badge";
import { StarButton } from "@/components/star-button";
import { formatListenDate } from "@/lib/format";
import { getListen } from "@/lib/listens";
import { createClient } from "@/lib/supabase/server";
import { deleteListen } from "../actions";

export const metadata: Metadata = { title: "Listen · Recorded" };

export default async function ListenPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const listen = await getListen(id);
  if (!listen) notFound();

  const { album } = listen;

  // Is this album one of your favorites? (Stars are private to you.)
  const supabase = await createClient();
  const { data: star } = await supabase
    .from("stars")
    .select("album_id")
    .eq("album_id", album.id)
    .maybeSingle();
  const details = [album.artist, album.release_year, album.genre].filter(Boolean).join(" · ");

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <Link href="/diary" className="text-sm text-muted hover:text-accent">
        ← Back to diary
      </Link>

      <article className="mt-6 flex flex-col gap-6 sm:flex-row">
        <AlbumCover title={album.title} artist={album.artist} coverUrl={album.cover_url} size="lg" />

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <div>
            <h1 className="text-3xl font-semibold leading-tight">{album.title}</h1>
            <p className="mt-1 text-muted">{details}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <ScoreBadge score={listen.score} size="lg" />
            <span className="text-muted">Listened on {formatListenDate(listen.listened_on)}</span>
          </div>

          {listen.review ? (
            <p className="whitespace-pre-line leading-relaxed">{listen.review}</p>
          ) : (
            <p className="text-sm text-muted">No review.</p>
          )}

          <div className="mt-2 flex flex-wrap items-start gap-3">
            <StarButton albumId={album.id} albumTitle={album.title} starred={Boolean(star)} />
            <Link
              href={`/listens/${listen.id}/edit`}
              className="flex h-10 items-center rounded-md border border-line px-4 hover:border-accent"
            >
              Edit
            </Link>
            <DeleteListenButton
              action={deleteListen.bind(null, listen.id)}
              albumTitle={album.title}
            />
          </div>
        </div>
      </article>
    </main>
  );
}
