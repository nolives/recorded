# Prompt log: Test 2, Dashboard average score

**Agent:** Claude Code (desktop app), Nov 2, 2026
**Issue:** #31 · **Branch:** `test/dashboard-average`
**Required test 2** (PLAN.md section 4)

## 1. Building it

> "I just merged it" (test 1)

**Agent:** Started test 2. Like test 1, it runs against the live database with the two throwaway test accounts (my decision from test 1, in Plan vs. Reality). This red step only breaks code, so the privacy rules stay on the whole time.

**First, a small change so the test checks what the Stats page really shows.** The page used to load its listens and work out the stats inside the page itself. That moved into one shared function, `loadDashboardStats` (`src/lib/dashboard-data.ts`), which the page and the test both use. The agent checked the Stats page afterwards and the numbers were the same (11 listens, 7.8, Children's Music).

**The test** (`tests/dashboard-average.test.ts`), in plain English:

> This test signs in as two real accounts. **User A** (test account 1) logs three listens scored **7, 8 and 10**. **User B** (test account 2) logs one listen scored **2**. Then, signed in as User A, it works out User A's dashboard stats with the same function the Stats page uses, and checks that:
> 1. User A's **average score is "8.3"** (7 + 8 + 10 = 25, ÷ 3 = 8.33…, rounded to one decimal);
> 2. **only User A's 3 listens count**: User B's 2 isn't in there. (If it were, the average would be 6.8.)
>
> A set-up step first makes sure User A starts with no listens, so only these three count. At the end the test deletes all its listens.

## 2. Red, then green

**How the feature was broken:** one line in `src/lib/format.ts`, changing the average to round to a whole number:

```diff
-  return average.toFixed(1).replace(/\.0$/, "");
+  return String(Math.round(average)); // TEMPORARY BREAK for the red run
```

| Run | Result | Saved output |
|---|---|---|
| **Red** (math broken) | **1 failed, 1 passed**: "expected '8' to be '8.3'". The red screenshot also shows the one-line change above it | `tests/results/dashboard-average-red.txt` |
| **Green** (math restored; `git diff` shows no changes) | **2 passed** | `tests/results/dashboard-average-green.txt` |

**What would break it:** a change that rounds the average differently, for example to whole numbers like the red run, counts unscored listens as 0, or loosens the listens privacy rules so User B's 2 gets into User A's average (6.8 instead of 8.3).

## 3. Mistakes caught

1. **The agent's first edit to the Stats page went wrong.** Its script looked for "the first `return (`" to know where to cut. That was in a different function earlier in the file, so it pasted the new line between every character of the page. The type check failed with hundreds of errors and the agent noticed right away. **Fix:** restored the file from Git and made the edit with the editor, which matches the exact text.
2. **The first red run wasn't red.** The command meant to break the average used a search pattern that didn't match, so nothing changed, and the "red" tab ran the normal code and passed. The agent noticed because the command printed nothing and the test passed. **Fix:** made the break with the editor and ran red again. That run shows the change and the failure on one screen.
3. **Too many terminal tabs.** The app refused to open another one, so the agent closed test 1's three tabs. Their screenshots were already in the merged test 1 PR.
