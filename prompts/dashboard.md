# Prompt log: Feature 8, Dashboard

**Agent:** Claude Code (desktop app), Nov 2, 2026
**Issue:** #21 · **Branch:** `feature/dashboard`
**Spine feature:** dashboard with 1 chart + 2–3 stats (user story 7 in PLAN.md)

## 1. Before starting

> "I just merged the PR. one other thing, does it make sense to add the functionality to favorite an album when you log it?"

**Agent:** Yes. A "★ Add to favorites" checkbox on the Log and Edit forms is about 30 minutes of work. It suggested building the required dashboard first.

> "dashboard first, we can also hold off on the favorites checkbox to see if thats feedback I get during the app test"

**Decision (mine):** Wait for the stranger test. The idea is saved as backlog Issue #20 (like Top 5, #7).

## 2. Building it

**What it built:** a **Stats** page (`/dashboard`, new link in the header):

| Stat | How it's worked out |
|---|---|
| **Total listens** | Every listen in my diary |
| **Average score** | Scored listens only, rounded to one decimal (7, 8, 10 → **8.3**). Unscored listens are left out, as decided in feature 2. Shows "From 5 scored listens" |
| **Top genre** | The genre with the most listens. A tie goes to the alphabetically first one, so it never changes at random. "4 listens · see them" links to the diary filtered to that genre (feature 7) |

Plus a **bar chart of listens per month** for the last 12 months, with empty months included so gaps show.

**Agent decisions I went along with:**
- **All the math is in one plain function** (`dashboardStats` in `src/lib/stats.ts`) that takes a list of listens and returns the numbers, with no database inside. The required dashboard test can hand it A's 7, 8 and 10 and check for 8.3.
- **Followed a chart design guide** (the "dataviz" skill):
  - **Bar color:** the agent ran the guide's color checker on my amber `#F5A524`, and it **failed**: too bright for a filled shape on the dark background (lightness 0.78; dark mode wants 0.48–0.67). It tested deeper ambers until `#C4811B` passed every check. That's used only for chart bars; text and buttons keep the bright amber.
  - **Bar shape:** at most 24px wide, rounded only at the top, growing from one baseline.
  - **Labels:** only the busiest month gets a number on its bar, so the chart isn't covered in numbers.
  - **Hover or keyboard:** pointing at or tabbing to a column shows "8 listens / November 2026". The whole column is the target, so short bars are easy to hit.
  - **Table view:** a "Show as a table" view with the same numbers, for screen readers or anyone who prefers it.
  - **No legend:** there's only one thing plotted, and the title says what it is.
- **No JavaScript needed for the chart.** It's drawn by the server, and the tooltips are pure CSS.

## 3. Testing (built-in browser, test account, localhost)

The test account's 10 listens: scores 9, 7, 6, 5, 4 (5 unscored), 4 in "Children's Music", 2 in "Folk", 2 in October and 8 in November.

| Check | Expected | Shown |
|---|---|---|
| Total listens | 10 | 10 |
| Average score | (9+7+6+5+4) ÷ 5 = 6.2 | **6.2**/10, "From 5 scored listens" |
| Top genre | Children's Music, 4 | Children's Music, "4 listens · see them" |
| "see them" link | Diary filtered to Children's Music | "Showing 4 of 10 listens", genre menu set |
| Chart | Oct 2, Nov 8, the 10 months before at 0 | Same, "8" labeled on November |
| Hover October | Tooltip | "2 listens / October 2026" |
| Tab to November | Tooltip | "8 listens / November 2026" |
| Table view | 12 rows | 12 rows, ending Sep 0, Oct 2, Nov 8 |
| Phone width (375px) | Fits | Tiles stack, chart fits, every other month labeled |

## 4. Problems found

1. **The bars were invisible at first.** The running dev server hadn't picked up the new chart color added to the stylesheet. A restart fixed it (this dev server has done this a few times today).
2. **"Children's Music" was cut off** ("Children's …") in the Top genre tile. **Fix:** long words in that tile use a slightly smaller size and can wrap to a second line.
3. **The header no longer fit on a phone** after adding the Stats link: "Recorded." touched "Diary", and "Log out" wrapped onto two lines. **Fix:** on phones the page links get their own row under the logo; on wider screens it's one row as before.
