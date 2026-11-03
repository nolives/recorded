// Required test 1: data isolation (PLAN.md section 4).
//
// Given User A has logged a listen of "In Rainbows" and User B has logged
// nothing, when User B signs in and loads their diary, then User B's list
// is empty, and asking the database directly for User A's listen by its id
// returns nothing.
//
// User A is test account 2 and User B is test account 1. The test only
// prints listen ids (never album names, reviews or logins), so even when it
// fails it doesn't show anyone's data.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { removeTestListens, signInAs, testAlbumId, type Client } from "./helpers";

describe("Data isolation: User B can't see User A's listens", () => {
  let userA: Client;
  let userB: Client;
  let albumId: number;
  let listenOfA: number;

  beforeAll(async () => {
    userA = await signInAs(2);
    userB = await signInAs(1);

    // Given: User B has logged nothing. Count only listens that BELONG to
    // User B (not "every listen User B can see"), so this set-up step
    // still works when the privacy rules are broken and the real checks
    // below get to run and fail.
    const { data: me } = await userB.auth.getUser();
    const { data: bListens } = await userB.from("listens").select("id").eq("user_id", me.user!.id);
    if ((bListens ?? []).length > 0) {
      throw new Error("Test user 1 (User B) should have no listens before this test. Delete them and run again.");
    }

    // Given: User A logs a listen of "In Rainbows" (the test copy).
    albumId = await testAlbumId(userA);
    await removeTestListens(userA, albumId);
    const { data, error } = await userA
      .from("listens")
      .insert({ album_id: albumId, listened_on: "2026-11-01", score: 9, review: "Test listen" })
      .select("id")
      .single();
    if (error) throw error;
    listenOfA = data.id;
  });

  afterAll(async () => {
    await removeTestListens(userA, albumId);
    await Promise.all([userA.auth.signOut(), userB.auth.signOut()]);
  });

  it("set-up check: User A can see their own listen", async () => {
    const { data } = await userA.from("listens").select("id").eq("id", listenOfA);
    expect(data?.map((row) => row.id)).toEqual([listenOfA]);
  });

  it("User B's diary is empty", async () => {
    // The same request the diary page makes: "my listens, with their albums".
    const { data, error } = await userB.from("listens").select("id, albums (id)");
    expect(error).toBeNull();
    expect(data?.map((row) => row.id)).toEqual([]);
  });

  it("asking the database directly for User A's listen by its id returns nothing", async () => {
    const { data, error } = await userB.from("listens").select("id").eq("id", listenOfA).maybeSingle();
    expect(error).toBeNull();
    expect(data).toBeNull();
  });

  it("User B can't change or delete User A's listen either", async () => {
    const { data: changed } = await userB
      .from("listens")
      .update({ review: "Changed by User B" })
      .eq("id", listenOfA)
      .select("id");
    const { data: deleted } = await userB.from("listens").delete().eq("id", listenOfA).select("id");
    expect(changed ?? []).toEqual([]);
    expect(deleted ?? []).toEqual([]);

    // And from User A's side, the listen is still there, unchanged.
    const { data: stillThere } = await userA.from("listens").select("review").eq("id", listenOfA).single();
    expect(stillThere?.review).toBe("Test listen");
  });
});
