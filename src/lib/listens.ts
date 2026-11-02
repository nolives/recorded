import { createClient } from "@/lib/supabase/server";

// Loads one of the signed-in user's listens with its album.
// Returns null if the id isn't a number, doesn't exist, or belongs to
// someone else (Row Level Security hides other people's listens).
export async function getListen(rawId: string) {
  if (!/^\d+$/.test(rawId)) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("listens")
    .select(
      "id, listened_on, score, review, albums (id, title, artist, release_year, genre, cover_url, musicbrainz_id)",
    )
    .eq("id", Number(rawId))
    .maybeSingle();

  if (!data || !data.albums) return null;
  return { ...data, album: data.albums };
}
