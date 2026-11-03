"use server";

import { refresh } from "next/cache";
import { isSharing } from "@/lib/sharing";
import { createClient } from "@/lib/supabase/server";

export type SettingsState = { message?: string; error?: string };

const SAVE_ERROR = "Couldn't save that. Try again.";

async function signedInUserId() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return { supabase, userId: data?.claims?.sub };
}

// Saves who can see your profile. Picking "Link only" for the first time
// also makes your secret link.
export async function saveSharing(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const sharing = formData.get("sharing");
  if (!isSharing(sharing)) return { error: "Pick who can see your profile." };

  const { supabase, userId } = await signedInUserId();
  if (!userId) return { error: SAVE_ERROR };

  const { data: profile } = await supabase.from("profiles").select("share_token").eq("id", userId).single();
  const update: { sharing: string; share_token?: string } = { sharing };
  if (sharing === "link" && !profile?.share_token) update.share_token = crypto.randomUUID();

  // The privacy rules only let you change your own profile row.
  const { error } = await supabase.from("profiles").update(update).eq("id", userId);
  if (error) return { error: SAVE_ERROR };

  refresh();
  return { message: "Saved." };
}

// Makes a new secret link. The old one stops working straight away.
export async function resetShareLink(): Promise<SettingsState> {
  const { supabase, userId } = await signedInUserId();
  if (!userId) return { error: SAVE_ERROR };

  const { error } = await supabase
    .from("profiles")
    .update({ share_token: crypto.randomUUID() })
    .eq("id", userId);
  if (error) return { error: SAVE_ERROR };

  refresh();
  return { message: "New link made. The old link no longer works." };
}
