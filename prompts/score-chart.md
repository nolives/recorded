# Prompt log: "How you score" chart

**Agent:** Claude Code (desktop app), Nov 3, 2026
**Issue:** #38 · **Branch:** `feature/score-chart`
**Added after the plan** (in Plan vs. Reality)

## 1. The idea

> "one more, do you think it might make sense to add another chart about rating distribution in the stats section?"

**Agent:** Yes, and it's small. A score distribution gives the average context: 7.8 could be "lots of 8s" or "a mix of 10s and 5s". It's optional (the assignment needs one chart, which I already had), and it'll look sparse until I log more. It suggested cleaning up the test data first, then building it, then starring favorites and taking the dashboard screenshot last.

> "yes please"

**Decision (mine):** build it, after the cleanup.

## 2. Cleaning up test data first

A read-only preview found **two other real users** (my stranger testers) as well as my own listens. The cleanup only removes rows belonging to the two test accounts, plus albums only they added that no real person has logged or starred.

- The safety check stopped the delete this time, because other real people now have data. The agent asked me directly, listing exactly what would go.

> "Yes, delete the test data (Recommended)"

- **Deleted:** 14 test listens, 1 test star, and 8 test albums (the children's albums, "Claude Tamper MB", "In Rainbows (test)").
- **Left:** only real people's listens (mine and my two testers'), and my favorite. The test accounts still exist (empty) for `npm test`.

## 3. What changed

- **"How you score"** on the Stats page, under "Listens per month": one column for each score from 1 to 10.
  - Only the most common score gets a number on its column.
  - Hover or tab to a column for "2 listens / Scored 8/10".
  - There's a table view with all 10 rows.
- **Unscored listens aren't a column.** A line underneath says how many there are ("1 listen has no score, so it isn't shown (or counted in the average)"), matching how the average works.
- **Both charts now share one component** (`ColumnChart`, formerly the month chart), so they look and work the same.
- **The chart only appears once something is scored.**

## 4. Testing (built-in browser, test account 2, localhost)

- **Sign-in:** the browser's test-account sign-in had dropped. The agent couldn't read the test password, even with my OK in chat, because the app's safety rule blocks it, so I signed in again myself.
- **Test listens:** 5, all on albums **already in the shared list** (no new albums), scored 8, 8, 9, 6 and one unscored. Afterwards they were **deleted with the normal Delete button**, and a read-only check showed 0 test listens and 0 test albums left.

| Check | Result |
|---|---|
| Columns | 6 → 1, 8 → 2 (labeled), 9 → 1, all others 0 |
| Footnote | "1 listen has no score…" |
| Average tile | 7.8 (31 ÷ 4) |
| Hover over 8 | "2 listens / Scored 8/10" |
| Tab onto 8 | Same tooltip (a script focusing it didn't show it, because browsers only show keyboard focus styles after a real key press) |
| Table view | "Score / Listens", 10 rows |
| Both charts' labels for screen readers | Different ids, so each heading names its own chart |
| Phone width | All 10 score labels fit; no sideways scrolling |

Lint, type check and production build all pass. `npm test` wasn't re-run: the stats math for the average didn't change, and each run re-creates the fake test album that was just cleaned up.

## 5. Caught before committing

The first draft of this log and the PR description named my two stranger testers by username. This repo is public, so the safety check stopped the commit, and their usernames were taken out. They're described only as "two other real users (my stranger testers)".
