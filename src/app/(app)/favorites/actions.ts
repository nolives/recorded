"use server";

import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Stars or unstars an album for the signed-in user. It takes the state to
// end up in, not "flip it", so two quick clicks can't cancel each other out.
// The privacy rules make sure people can only add or remove their own stars.
export async function setStar(albumId: number, starred: boolean): Promise<{ ok: boolean }> {
  if (!Number.isSafeInteger(albumId) || albumId <= 0) return { ok: false };

  const supabase = await createClient();
  const { error } = starred
    ? await supabase
        .from("stars")
        .upsert({ album_id: albumId }, { onConflict: "user_id,album_id", ignoreDuplicates: true })
    : await supabase.from("stars").delete().eq("album_id", albumId);

  if (error) return { ok: false };
  refresh(); // reload the page's data so the diary and Favorites stay in step
  return { ok: true };
}
