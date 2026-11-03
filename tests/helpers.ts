import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

export type Client = SupabaseClient<Database>;

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}. Add it to .env.local / .env.test.local (see README).`);
  return value;
}

// Signs in as one of the two throwaway test accounts and returns a database
// connection that acts as that person, so every privacy rule applies to it
// exactly as it would in the app.
export async function signInAs(testUser: 1 | 2): Promise<Client> {
  const client = createClient<Database>(
    required("NEXT_PUBLIC_SUPABASE_URL"),
    required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { error } = await client.auth.signInWithPassword({
    email: required(`TEST_USER_${testUser}_EMAIL`),
    password: required(`TEST_USER_${testUser}_PASSWORD`),
  });
  if (error) throw new Error(`Couldn't sign in as test user ${testUser}: ${error.message}`);
  return client;
}

// An obviously fake album, so test data never mixes with a real one in the
// shared album list. Reused if an earlier run already made it.
export const TEST_ALBUM = { title: "In Rainbows (test)", artist: "Recorded Test" };

export async function testAlbumId(client: Client) {
  const { data: existing } = await client
    .from("albums")
    .select("id")
    .eq("title", TEST_ALBUM.title)
    .eq("artist", TEST_ALBUM.artist)
    .maybeSingle();
  if (existing) return existing.id;

  const { data, error } = await client.from("albums").insert(TEST_ALBUM).select("id").single();
  if (error) throw error;
  return data.id;
}

// Removes this user's listens of the test album (left over from a run that
// crashed halfway). Only ever touches the test album.
export async function removeTestListens(client: Client, albumId: number) {
  await client.from("listens").delete().eq("album_id", albumId);
}
