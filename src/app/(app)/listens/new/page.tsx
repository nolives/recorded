import type { Metadata } from "next";
import { ListenForm } from "@/components/listen-form";
import { createClient } from "@/lib/supabase/server";
import { createListen, type ListenFormValues } from "../actions";

export const metadata: Metadata = { title: "Log a listen · Recorded" };

// /listens/new?album=12 opens the form with that album already filled in
// (used by "Log a listen" on a random re-listen pick). Albums are shared,
// so any signed-in user can read them; an unknown id just gives an empty form.
async function albumValues(rawId: string | string[] | undefined): Promise<Partial<ListenFormValues>> {
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  if (!id || !/^\d{1,12}$/.test(id)) return {};

  const supabase = await createClient();
  const { data: album } = await supabase
    .from("albums")
    .select("title, artist, release_year, genre, cover_url, musicbrainz_id")
    .eq("id", Number(id))
    .maybeSingle();
  if (!album) return {};

  return {
    title: album.title,
    artist: album.artist,
    releaseYear: album.release_year?.toString() ?? "",
    genre: album.genre ?? "",
    musicbrainzId: album.musicbrainz_id ?? "",
    coverUrl: album.cover_url ?? "",
  };
}

export default async function NewListenPage({ searchParams }: PageProps<"/listens/new">) {
  const initialValues = await albumValues((await searchParams).album);

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold">Log a listen</h1>
      <ListenForm
        action={createListen}
        initialValues={initialValues}
        submitLabel="Save listen"
        pendingLabel="Saving…"
        cancelHref="/diary"
      />
    </main>
  );
}
