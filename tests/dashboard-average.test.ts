// Required test 2: a dashboard stat (PLAN.md section 4).
//
// Given User A has listens scored 7, 8, and 10, and User B has one listen
// scored 2, when User A's dashboard stats are calculated, then User A's
// average score is 8.3 (25 ÷ 3, rounded to one decimal), and User B's
// listen doesn't change it.
//
// User A is test account 1 and User B is test account 2. The stats come
// from loadDashboardStats, the same function the Stats page uses.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadDashboardStats } from "@/lib/dashboard-data";
import { removeTestListens, signInAs, testAlbumId, type Client } from "./helpers";

describe("Dashboard: User A's average score", () => {
  let userA: Client;
  let userB: Client;
  let albumId: number;

  beforeAll(async () => {
    userA = await signInAs(1);
    userB = await signInAs(2);

    // User A must start with no listens, so only the 3 below count.
    const { data: me } = await userA.auth.getUser();
    const { data: aListens } = await userA.from("listens").select("id").eq("user_id", me.user!.id);
    if ((aListens ?? []).length > 0) {
      throw new Error("Test user 1 (User A) should have no listens before this test. Delete them and run again.");
    }

    albumId = await testAlbumId(userA);
    await removeTestListens(userB, albumId);

    // Given: User A has listens scored 7, 8 and 10 ...
    const { error: aError } = await userA.from("listens").insert([
      { album_id: albumId, listened_on: "2026-10-01", score: 7 },
      { album_id: albumId, listened_on: "2026-10-15", score: 8 },
      { album_id: albumId, listened_on: "2026-11-01", score: 10 },
    ]);
    if (aError) throw aError;

    // ... and User B has one listen scored 2.
    const { error: bError } = await userB
      .from("listens")
      .insert({ album_id: albumId, listened_on: "2026-11-01", score: 2 });
    if (bError) throw bError;
  });

  afterAll(async () => {
    await removeTestListens(userA, albumId);
    await removeTestListens(userB, albumId);
    await Promise.all([userA.auth.signOut(), userB.auth.signOut()]);
  });

  it("User A's average score is 8.3 (25 ÷ 3, rounded to one decimal)", async () => {
    const { stats, failed } = await loadDashboardStats(userA);
    expect(failed).toBe(false);
    expect(stats.averageScore).toBe("8.3");
  });

  it("only User A's 3 listens count, not User B's 2", async () => {
    const { stats } = await loadDashboardStats(userA);
    expect(stats.totalListens).toBe(3);
    expect(stats.scoredListens).toBe(3);
  });
});
