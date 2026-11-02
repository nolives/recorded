# Prompt log: Feature 6, Stars and Favorites page

**Agent:** Claude Code (desktop app), Nov 2, 2026
**Issue:** #14 · **Branch:** `feature/stars`
**Spine feature:** stars junction table + starred view (user story 5 in PLAN.md)

## 1. Cleaning up test data first

> "I just merged pr 13"

**Agent:**
- Before I logged real albums, pointed out that its feature 5 testing had left real albums (*SOS*, *Ctrl*, *In Rainbows*, *The Fame*) in the shared album list, attached to a throwaway test account.
- My real listens would have attached to those copies, and then the copies couldn't be deleted later.
- Asked before changing the live database.

> "Yes, run it"

**Agent:**
- Previewed the rows first (read-only). My account had no listens, so nothing of mine was affected.
- Deleted 9 test listens and 7 test albums in one all-or-nothing step.
- Confirmed the database had 0 albums, 0 listens and 0 stars. The two test accounts were kept for testing.

## 2. Building it

> "Start feature 6"

**Agent:** Checked PLAN.md, which calls the starred view the **Favorites page**. The `stars` table and its privacy rules were already built in feature 2, so no database changes were needed.

**What it built:**
- **Favorite button** on each listen's page.
  - It stars or unstars the album (not just that one listen), because stars mean all-time favorites.
  - It changes the moment you click, then saves in the background. If saving fails, it flips back and says "Couldn't save. Try again."
- **★ in the diary** next to every listen of a starred album.
- **Favorites page** (`/favorites`, new link in the header): a grid of starred album covers, newest star first. Each shows:
  - "Logged 2 times · average 8.5" (unscored listens are left out of the average, as decided in feature 2)
  - a link to your most recent listen of it
  - a ★ button to unstar it right there
- **Empty state:** "No favorites yet. Open any listen in your diary and press Favorite…"

**Agent decisions I went along with:**
- The button sends "make it starred" or "make it unstarred", not "flip it". If two clicks get processed out of order, the result is still what you clicked last.
- If you delete every listen of a favorite album, it stays on Favorites, labeled "Not in your diary right now" and with no link. Unstarring is a separate choice from deleting listens.
- Added `averageScore()` to `src/lib/format.ts` (rounds to one decimal: 7, 8, 10 → "8.3"). The dashboard and its required test will reuse it.
- Used the `refresh()` function from this version of Next.js (found in its bundled docs) to reload the page's data after starring.

## 3. Testing

**In the built-in browser (test account 2, localhost):** logged 4 listens: *SOS* twice (7 and 10), *Ctrl* (8), and *In Rainbows* (no score).

| Check | Result |
|---|---|
| Favorites with nothing starred | Empty state shows |
| Star *In Rainbows* | Button turns amber right away; still starred after reloading |
| *Ctrl* starred; click its button 3 times, 150ms apart | Showed unstarred, starred, unstarred, and ended **unstarred** (3 flips from starred: correct). A reload agreed |
| Favorites page | *SOS*: "Logged 2 times · average 8.5", links to the Oct 29 listen. *In Rainbows*: "Logged once" (no score) |
| Diary | ★ on both *SOS* listens and *In Rainbows*; none on *Ctrl* |
| Unstar from the Favorites page | Card disappears; count goes from 2 to 1 |
| Delete the only listen of a starred album | Stays on Favorites as "Not in your diary right now", with no link |
| Phone width (375px) | Header, Favorites grid and listen page all fit |

**First rapid-click test didn't test anything:** the agent's script clicked 3 times in the same instant, before React could redraw, so all 3 clicks saw "not starred". It reran with 150ms gaps, which is still faster than a person double-clicking.

**Privacy check with two accounts** (`supabase/checks/stars_privacy.mjs`):
- The agent wasn't allowed to read the test password into the chat (a safety rule), so it wrote a script that signs in as test account 1 on its own and prints only results.

| Test account 1 tries to… | Result |
|---|---|
| Read test account 2's stars | Sees 0 |
| Delete test account 2's stars | 0 removed |
| Add a star in test account 2's name | Blocked by the privacy rules |
| Star and unstar its own album | Works |

Afterward, test account 2 still had both of its favorites.

## 4. Test data to clean up

Test account 2 now has listens 24–26 and stars on *SOS* and *In Rainbows*. It also added the albums *SOS*, *Ctrl* and *In Rainbows* to the shared list, so these need the same cleanup as in section 1 before I log those albums myself.
