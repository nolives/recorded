"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ListenFormValues = {
  title: string;
  artist: string;
  releaseYear: string;
  genre: string;
  listenedOn: string;
  score: string;
  review: string;
};

export type ListenFormState = {
  message?: string;
  values?: ListenFormValues;
};

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
  };
}

function toNumberOrNull(value: string) {
  return value === "" ? null : Number(value);
}

// ilike treats % and _ as wildcards; escape them so we match exactly.
function exact(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}

// Albums are shared: reuse the album if one with the same title and artist
// exists (ignoring capitals), otherwise add it.
async function findOrCreateAlbum(supabase: Supabase, values: ListenFormValues) {
  const { data: existing, error: findError } = await supabase
    .from("albums")
    .select("id")
    .ilike("title", exact(values.title))
    .ilike("artist", exact(values.artist))
    .order("id")
    .limit(1)
    .maybeSingle();
  if (findError) throw findError;
  if (existing) return existing.id;

  const { data: created, error: insertError } = await supabase
    .from("albums")
    .insert({
      title: values.title,
      artist: values.artist,
      release_year: toNumberOrNull(values.releaseYear),
      genre: values.genre || null,
    })
    .select("id")
    .single();
  if (insertError) throw insertError;
  return created.id;
}

const SAVE_ERROR = "We couldn't save this listen. Check the fields and try again.";

export async function createListen(
  _prev: ListenFormState,
  formData: FormData,
): Promise<ListenFormState> {
  const values = readForm(formData);
  const supabase = await createClient();

  let listenId: number;
  try {
    const albumId = await findOrCreateAlbum(supabase, values);
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
  const supabase = await createClient();

  try {
    const albumId = await findOrCreateAlbum(supabase, values);

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
