"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { lookupItunesAlbum, type ItunesAlbum } from "@/lib/itunes";
import { validateListen, type ListenErrors, type ListenInput } from "@/lib/validation";

// itunesId and coverUrl are set by the iTunes search box. coverUrl is only
// used to show the cover again after a failed save; the saved cover always
// comes from Apple.
export type ListenFormValues = ListenInput & { itunesId: string; coverUrl: string };

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
    itunesId: clean(formData.get("itunesId")),
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
// 1. the album already in our list with the same iTunes id
// 2. otherwise ask Apple about that id, so a cover or id changed by hand in
//    the page can't end up in the shared list
// 3. then reuse the album with the same title and artist (ignoring capitals),
//    or add a new one, with its iTunes cover if there is one
// Returns "itunes-unavailable" if Apple needed asking but didn't answer.
async function resolveAlbum(
  supabase: Supabase,
  values: ListenFormValues,
): Promise<number | "itunes-unavailable"> {
  if (!/^\d{1,12}$/.test(values.itunesId)) {
    return findOrCreateAlbum(supabase, values, null);
  }

  const { data: sameItunes, error } = await supabase
    .from("albums")
    .select("id")
    .eq("itunes_id", Number(values.itunesId))
    .maybeSingle();
  if (error) throw error;
  if (sameItunes) return sameItunes.id;

  const itunes = await lookupItunesAlbum(values.itunesId);
  if (itunes === "unavailable") return "itunes-unavailable";
  return findOrCreateAlbum(supabase, values, itunes);
}

async function findOrCreateAlbum(
  supabase: Supabase,
  values: ListenFormValues,
  itunes: ItunesAlbum | null,
) {
  // For an iTunes album, use Apple's spelling of the title and artist, so a
  // made-up title can't be saved next to a real album's cover.
  const title = itunes?.title ?? values.title;
  const artist = itunes?.artist ?? values.artist;

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
    // An album typed in by hand earlier gets the iTunes cover now. The
    // privacy rules only let the person who added it change it; for anyone
    // else this changes nothing.
    if (itunes) {
      await supabase
        .from("albums")
        .update({ itunes_id: itunes.itunesId, cover_url: itunes.coverUrl || null })
        .eq("id", existing.id)
        .is("itunes_id", null);
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
      itunes_id: itunes?.itunesId ?? null,
      cover_url: itunes?.coverUrl || null,
    })
    .select("id")
    .single();
  if (insertError) throw insertError;
  return created.id;
}

const SAVE_ERROR = "Something went wrong saving this listen. Please try again.";
const ITUNES_DOWN =
  "Couldn't check this album with iTunes just now. Try again in a minute, or click Remove cover to save it without the cover.";

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
    if (albumId === "itunes-unavailable") return { message: ITUNES_DOWN, values };
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
    if (albumId === "itunes-unavailable") return { message: ITUNES_DOWN, values };

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
