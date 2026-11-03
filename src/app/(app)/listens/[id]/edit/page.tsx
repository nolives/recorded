import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ListenForm } from "@/components/listen-form";
import { getListen } from "@/lib/listens";
import { createClient } from "@/lib/supabase/server";
import { updateListen } from "../../actions";

export const metadata: Metadata = { title: "Edit listen · Recorded" };

export default async function EditListenPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const listen = await getListen(id);
  if (!listen) notFound();

  const { album } = listen;

  // Is the album one of your favorites? (Stars are private to you.)
  const supabase = await createClient();
  const { data: star } = await supabase.from("stars").select("album_id").eq("album_id", album.id).maybeSingle();

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold">Edit listen</h1>
      <ListenForm
        action={updateListen.bind(null, listen.id)}
        initialValues={{
          title: album.title,
          artist: album.artist,
          releaseYear: album.release_year?.toString() ?? "",
          genre: album.genre ?? "",
          listenedOn: listen.listened_on,
          score: listen.score?.toString() ?? "",
          review: listen.review ?? "",
          musicbrainzId: album.musicbrainz_id ?? "",
          coverUrl: album.cover_url ?? "",
          favorite: star ? "on" : "",
        }}
        editing
        submitLabel="Save changes"
        pendingLabel="Saving…"
        cancelHref={`/listens/${listen.id}`}
      />
    </main>
  );
}
