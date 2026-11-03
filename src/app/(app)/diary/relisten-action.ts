"use server";

import { chooseRelisten } from "@/lib/relisten";
import { createClient } from "@/lib/supabase/server";

export type RelistenPick = {
  albumId: number;
  title: string;
  artist: string;
  releaseYear: number | null;
  coverUrl: string | null;
  bestScore: number;
  lastListened: string;
  daysSince: number;
  latestListenId: number;
};

export type RelistenResult =
  | { status: "picked"; pick: RelistenPick }
  | { status: "none" } // nothing scored 8 or higher yet
  | { status: "error" };

// Picks an album to re-listen to. skipAlbumId is the album shown last time,
// so "Pick another" doesn't repeat it.
export async function pickRelisten(skipAlbumId?: number): Promise<RelistenResult> {
  const skip = Number.isSafeInteger(skipAlbumId) ? skipAlbumId : undefined;
  const supabase = await createClient();

  // Row Level Security only returns the signed-in user's own listens.
  const { data: listens, error } = await supabase.from("listens").select("id, album_id, listened_on, score");
  if (error) return { status: "error" };

  const choice = chooseRelisten(listens, { skipAlbumId: skip });
  if (!choice) return { status: "none" };

  const { data: album } = await supabase
    .from("albums")
    .select("title, artist, release_year, cover_url")
    .eq("id", choice.albumId)
    .maybeSingle();
  if (!album) return { status: "error" };

  // The most recent listen of this album, to link to.
  const latest = listens
    .filter((listen) => listen.album_id === choice.albumId)
    .sort((a, b) => b.listened_on.localeCompare(a.listened_on) || b.id - a.id)[0];

  return {
    status: "picked",
    pick: {
      albumId: choice.albumId,
      title: album.title,
      artist: album.artist,
      releaseYear: album.release_year,
      coverUrl: album.cover_url,
      bestScore: choice.bestScore,
      lastListened: choice.lastListened,
      daysSince: choice.daysSince,
      latestListenId: latest.id,
    },
  };
}
