"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isMbid, lookupAlbum, type FoundAlbum } from "@/lib/musicbrainz";
import { validateListen, type ListenErrors, type ListenInput } from "@/lib/validation";

// musicbrainzId and coverUrl are set by the album search box. coverUrl is
// only used to show the cover again after a failed save; the saved cover
// always comes from the server's own lookup.
// favorite is "on" when the Favorite box is ticked.
export type ListenFormValues = ListenInput & { musicbrainzId: string; coverUrl: string; favorite: string };

export type ListenFormState = {
  message?: string;
  errors?: ListenErrors;
  values?: ListenFormValues;
};

// Runs the friendly checks. Returns a form state to show if anything is wrong.
function checkForm(values: ListenFormValues): ListenFormState | null {
  const errors = validateListen(values);
  const count = Object.keys(errors).length;
  if (count === 0) return null;
  return {
    errors,
    values,
    message: count === 1 ? "Fix the highlighted field to save." : `Fix the ${count} highlighted fields to save.`,
  };
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

// Collapse extra spaces so "In  Rainbows " and "In Rainbows" match.
function clean(value: FormDataEntryValue | null) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function readForm(formData: FormData): ListenFormValues {
  return {
    title: clean(formData.get("title")),
    artist: clean(formData.get("artist")),
    releaseYear: clean(formData.get("releaseYear")),
    genre: clean(formData.get("genre")),
    listenedOn: clean(formData.get("listenedOn")),
    score: clean(formData.get("score")),
    review: String(formData.get("review") ?? "").trim(),
    musicbrainzId: clean(formData.get("musicbrainzId")).toLowerCase(),
    favorite: formData.get("favorite") === "on" ? "on" : "",
    coverUrl: clean(formData.get("coverUrl")),
  };
}

function toNumberOrNull(value: string) {
  return value === "" ? null : Number(value);
}

// ilike treats % and _ as wildcards; escape them so we match exactly.
function exact(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}

// Albums are shared, so reuse one when we can:
// 1. the album already in our list with the same MusicBrainz id
// 2. otherwise ask MusicBrainz about that id, so a title or id changed by
//    hand in the page can't end up in the shared list
// 3. then reuse the album with the same title and artist (ignoring capitals),
//    or add a new one, with its cover if there is one
// Returns "lookup-unavailable" if MusicBrainz needed asking but didn't answer.
async function resolveAlbum(
  supabase: Supabase,
  values: ListenFormValues,
): Promise<number | "lookup-unavailable"> {
  if (!isMbid(values.musicbrainzId)) {
    return findOrCreateAlbum(supabase, values, null);
  }

  const { data: sameAlbum, error } = await supabase
    .from("albums")
    .select("id")
    .eq("musicbrainz_id", values.musicbrainzId)
    .maybeSingle();
  if (error) throw error;
  if (sameAlbum) return sameAlbum.id;

  const found = await lookupAlbum(values.musicbrainzId);
  if (found === "unavailable") return "lookup-unavailable";
  return findOrCreateAlbum(supabase, values, found);
}

async function findOrCreateAlbum(
  supabase: Supabase,
  values: ListenFormValues,
  found: FoundAlbum | null,
) {
  // For a looked-up album, use MusicBrainz's spelling of the title and
  // artist, so a made-up title can't be saved next to a real album's cover.
  const title = found?.title ?? values.title;
  const artist = found?.artist ?? values.artist;

  const { data: existing, error: findError } = await supabase
    .from("albums")
    .select("id")
    .ilike("title", exact(title))
    .ilike("artist", exact(artist))
    .order("id")
    .limit(1)
    .maybeSingle();
  if (findError) throw findError;
  if (existing) {
    // An album typed in by hand (or saved from iTunes) earlier gets linked
    // now, takes MusicBrainz's capitals ("big red car" → "Big Red Car"; the
    // match above ignores capitals, so only they can differ), and gets a
    // cover if it had none. The privacy rules only let the person who added
    // it change it; for anyone else this changes nothing.
    if (found) {
      await supabase
        .from("albums")
        .update({ musicbrainz_id: found.mbid, title, artist })
        .eq("id", existing.id)
        .is("musicbrainz_id", null);
      if (found.coverUrl) {
        await supabase
          .from("albums")
          .update({ cover_url: found.coverUrl })
          .eq("id", existing.id)
          .is("cover_url", null);
      }
    }
    return existing.id;
  }

  const { data: created, error: insertError } = await supabase
    .from("albums")
    .insert({
      title,
      artist,
      release_year: toNumberOrNull(values.releaseYear),
      genre: values.genre || null,
      musicbrainz_id: found?.mbid ?? null,
      cover_url: found?.coverUrl || null,
    })
    .select("id")
    .single();
  if (insertError) throw insertError;
  return created.id;
}

// Stars or unstars the album for the signed-in user (the privacy rules only
// let people change their own stars). A star that fails to save doesn't
// undo the listen; the Favorite button on the listen's page still works.
async function setFavorite(supabase: Supabase, albumId: number, favorite: boolean) {
  if (favorite) {
    await supabase
      .from("stars")
      .upsert({ album_id: albumId }, { onConflict: "user_id,album_id", ignoreDuplicates: true });
  } else {
    await supabase.from("stars").delete().eq("album_id", albumId);
  }
}

const SAVE_ERROR = "Something went wrong saving this listen. Please try again.";
const LOOKUP_DOWN =
  "Couldn't check this album with MusicBrainz just now. Try again in a minute, or click Remove link to save it as typed.";

export async function createListen(
  _prev: ListenFormState,
  formData: FormData,
): Promise<ListenFormState> {
  const values = readForm(formData);
  const problems = checkForm(values);
  if (problems) return problems;

  const supabase = await createClient();

  let listenId: number;
  try {
    const albumId = await resolveAlbum(supabase, values);
    if (albumId === "lookup-unavailable") return { message: LOOKUP_DOWN, values };
    const { data, error } = await supabase
      .from("listens")
      .insert({
        album_id: albumId,
        listened_on: values.listenedOn,
        score: toNumberOrNull(values.score),
        review: values.review || null,
      })
      .select("id")
      .single();
    if (error) throw error;
    listenId = data.id;
    // On the Log form, ticking Favorite stars the album; leaving it unticked
    // never removes a star the album already has.
    if (values.favorite === "on") await setFavorite(supabase, albumId, true);
  } catch {
    return { message: SAVE_ERROR, values };
  }

  redirect(`/listens/${listenId}`);
}

export async function updateListen(
  listenId: number,
  _prev: ListenFormState,
  formData: FormData,
): Promise<ListenFormState> {
  const values = readForm(formData);
  const problems = checkForm(values);
  if (problems) return problems;

  const supabase = await createClient();

  try {
    const albumId = await resolveAlbum(supabase, values);
    if (albumId === "lookup-unavailable") return { message: LOOKUP_DOWN, values };

    // Year and genre belong to the shared album. The privacy rules only let
    // the person who added the album change them; for anyone else this
    // update changes nothing.
    await supabase
      .from("albums")
      .update({
        release_year: toNumberOrNull(values.releaseYear),
        genre: values.genre || null,
      })
      .eq("id", albumId);

    const { data, error } = await supabase
      .from("listens")
      .update({
        album_id: albumId,
        listened_on: values.listenedOn,
        score: toNumberOrNull(values.score),
        review: values.review || null,
      })
      .eq("id", listenId)
      .select("id");
    if (error) throw error;
    if (!data || data.length === 0) {
      return { message: "That listen doesn't exist anymore.", values };
    }
    // On the Edit form the box shows the current state, so it can add or
    // remove the star.
    await setFavorite(supabase, albumId, values.favorite === "on");
  } catch {
    return { message: SAVE_ERROR, values };
  }

  redirect(`/listens/${listenId}`);
}

export async function deleteListen(listenId: number) {
  const supabase = await createClient();
  await supabase.from("listens").delete().eq("id", listenId);
  redirect("/diary");
}
