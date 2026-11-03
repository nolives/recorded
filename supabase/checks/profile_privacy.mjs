// Privacy check for shared profiles (feature 10). Run from the project folder:
//   node supabase/checks/profile_privacy.mjs
// Uses the two throwaway test accounts (logins come from .env.test.local,
// which is never committed) plus a logged-out visitor. It changes only test
// account 2's sharing setting, and puts it back to Private at the end.
// Prints results only, never the login details.
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
const client = () =>
  createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false },
  });
async function signedIn(n) {
  const c = client();
  const { error } = await c.auth.signInWithPassword({
    email: env[`TEST_USER_${n}_EMAIL`],
    password: env[`TEST_USER_${n}_PASSWORD`],
  });
  if (error) throw new Error(`login ${n} failed: ${error.message}`);
  return c;
}

const owner = await signedIn(2); // test account 2 owns the profile
const other = await signedIn(1); // test account 1 is another user
const visitor = client(); // logged out
const NAME = "claude_test_2";

let failures = 0;
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}: ${JSON.stringify(actual)}${ok ? "" : ` (expected ${JSON.stringify(expected)})`}`);
}
// How much of the profile a viewer can see: [profile rows, listens, favorites]
async function sees(c, key) {
  const args = { p_username: NAME, p_key: key };
  const [p, l, f] = await Promise.all([
    c.rpc("shared_profile", args),
    c.rpc("shared_listens", args),
    c.rpc("shared_favorites", args),
  ]);
  return [p.data?.length ?? `error ${p.error?.code}`, (l.data?.length ?? 0) > 0, (f.data?.length ?? 0) > 0];
}
async function setSharing(sharing, newToken = false) {
  const update = { sharing };
  if (newToken) update.share_token = crypto.randomUUID();
  const { data: me } = await owner.auth.getUser();
  const { error } = await owner.from("profiles").update(update).eq("id", me.user.id);
  if (error) throw error;
  const { data } = await owner.from("profiles").select("share_token").eq("id", me.user.id).single();
  return data.share_token;
}

console.log("— Private —");
await setSharing("private");
check("visitor sees nothing", await sees(visitor), [0, false, false]);
check("other user sees nothing", await sees(other), [0, false, false]);
check("owner sees own profile", await sees(owner), [1, true, true]);
const ownerRow = (await owner.rpc("shared_profile", { p_username: NAME })).data?.[0];
check("owner row says is_owner, has no share_token", [ownerRow?.is_owner, "share_token" in (ownerRow ?? {})], [true, false]);

console.log("— Public —");
await setSharing("public");
check("visitor sees it", await sees(visitor), [1, true, true]);
check("other user sees it", await sees(other), [1, true, true]);
check("capital letters in the address still work", (await visitor.rpc("shared_profile", { p_username: "Claude_Test_2" })).data?.length, 1);

console.log("— Link only —");
const key = await setSharing("link", true);
check("visitor without key sees nothing", await sees(visitor), [0, false, false]);
check("visitor with right key sees it", await sees(visitor, key), [1, true, true]);
check("visitor with wrong key sees nothing", await sees(visitor, crypto.randomUUID()), [0, false, false]);
const newKey = await setSharing("link", true); // "Reset link"
check("old key stops working after reset", await sees(visitor, key), [0, false, false]);
check("new key works", await sees(visitor, newKey), [1, true, true]);
await setSharing("private");
check("right key stops working once Private", await sees(visitor, newKey), [0, false, false]);

console.log("— Things nobody should be able to do —");
const { error: helperError } = await visitor.rpc("visible_profile_id", { p_username: NAME, p_key: null });
check("visitor can't call the internal check directly", Boolean(helperError), true);
const { data: rawProfiles } = await visitor.from("profiles").select("username");
const { data: rawListens } = await visitor.from("listens").select("id");
check("visitor can't read tables directly", [rawProfiles?.length ?? 0, rawListens?.length ?? 0], [0, 0]);
const { data: me } = await owner.auth.getUser();
const { error: renameError } = await owner.from("profiles").update({ username: "hijacked" }).eq("id", me.user.id);
check("owner can't change username through the API", Boolean(renameError), true);
const { data: changed } = await other.from("profiles").update({ sharing: "public" }).eq("username", NAME).select();
check("other user can't change test 2's setting", changed?.length ?? 0, 0);
check("test 2 is still Private afterwards", await sees(visitor), [0, false, false]);

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) FAILED.`);
for (const c of [owner, other]) await c.auth.signOut();
process.exit(failures === 0 ? 0 : 1);
