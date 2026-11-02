import { createClient } from "@/lib/supabase/server";

export type CurrentUser = { id: string; username: string | null };

// Returns the signed-in user and their username, or null if logged out.
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", userId)
    .maybeSingle();

  return { id: userId, username: profile?.username ?? null };
}
