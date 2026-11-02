// Two-account privacy check for stars. Run from the project folder:
//   node supabase/checks/stars_privacy.mjs
// Signs in as test account 1 (logins come from .env.test.local, which is
// never committed) and tries to read, remove and add test account 2's
// stars. Prints results only, never the login details.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(process.cwd() + "/package.json");
const { createClient } = require("@supabase/supabase-js");

const env = {};
for (const file of [".env.local", ".env.test.local"]) {
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false },
});
const { error: loginError } = await supabase.auth.signInWithPassword({
  email: env.TEST_USER_1_EMAIL,
  password: env.TEST_USER_1_PASSWORD,
});
if (loginError) { console.log("login failed:", loginError.message); process.exit(1); }

const { data: other } = await supabase.from("profiles").select("id").eq("username", "claude_test_2").maybeSingle();
console.log("1. can see test 2's profile row:", Boolean(other), "(expected false: profiles are private)");

const { data: albums } = await supabase.from("albums").select("id, title").in("title", ["SOS", "In Rainbows"]);
console.log("   albums visible (shared list):", albums.map((a) => a.title).join(", "));

const { data: seen } = await supabase.from("stars").select("user_id, album_id");
console.log("2. stars test 1 can read:", seen.length, "(expected 0)");

const ids = albums.map((a) => a.id);
const { data: removed, error: delError } = await supabase.from("stars").delete().in("album_id", ids).select();
console.log("3. test 2's stars test 1 removed:", removed?.length ?? 0, delError ? `error: ${delError.message}` : "", "(expected 0)");

// Try to add a star in test 2's name, using test 2's id from the albums table.
const { data: added } = await supabase.from("albums").select("added_by").eq("id", ids[0]).single();
const { error: fakeError } = await supabase.from("stars").insert({ user_id: added.added_by, album_id: ids[1] ?? ids[0] });
console.log("4. star in test 2's name:", fakeError ? `blocked (${fakeError.code})` : "ALLOWED (bad)");

const { error: ownError } = await supabase.from("stars").insert({ album_id: ids[0] });
const { data: mine } = await supabase.from("stars").select("album_id");
console.log("5. test 1 stars its own album:", ownError ? `error ${ownError.message}` : "ok", "| test 1 now sees", mine.length, "star (expected 1)");
await supabase.from("stars").delete().eq("album_id", ids[0]);
const { data: after } = await supabase.from("stars").select("album_id");
console.log("   test 1 unstarred it again; test 1 sees", after.length, "stars");
await supabase.auth.signOut();
