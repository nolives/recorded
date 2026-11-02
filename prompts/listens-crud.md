# Prompt log: Feature 3, log, view, edit, and delete listens

**Agent:** Claude Code (desktop app), Nov 2, 2026
**Issue:** #8 · **Branch:** `feature/listens-crud`

## 1. A side idea before starting

> "I merged it. another thing, would listing your top 5 albums on your profile page be considered a feature? if so, would be something to consider to add later"

**Agent:**
- Yes, it would count as a feature. But it overlaps with stars ("all-time favorites"), and extra features beyond my 3 don't earn extra points.
- Saved it as backlog Issue #7 with a new `backlog` label. It describes two ways to build it: picked by hand or calculated from scores. It could replace feature 10 if that gets cut.

**Decision (mine):** Keep it in the backlog for now.

## 2. Building the feature

> "Start feature 3"

**Agent:** Opened Issue #8, generated TypeScript types from the database (`npm run gen:types`), and built:

| Page | What it does |
|---|---|
| `/listens/new` | **Create.** A form for album title, artist, release year, genre, date listened (defaults to today in my time zone), an optional score (dropdown: No score, 10 to 1), and an optional review |
| `/diary` | **Read (list).** My listens, newest first, with the cover placeholder, title, artist, year, score, and date. Shows a friendly empty state |
| `/listens/[id]` | **Read (detail).** One listen's album info, score, date, and review, with Edit and Delete buttons |
| `/listens/[id]/edit` | **Update.** The same form, filled in with the current values |
| Delete button | **Delete.** Opens an "Are you sure?" pop-up with Cancel and "Yes, delete" |

**How albums are reused:** Because albums are shared, saving a listen first looks for an album with the same title and artist, ignoring capitals and extra spaces. If one exists, the listen links to it; otherwise a new album is added. Only the person who added an album can change its year or genre.

**Agent decisions I went along with:**
- Logged-in visitors who open the home page go straight to their diary.
- The header gained "Diary" and "Log" links.
- Friendly per-field error messages are left for feature 4 (validation), so that PR has its own clear purpose. For now, the browser's built-in "please fill out this field" prompt and a general "We couldn't save this listen" message cover blank fields.

## 3. Testing (in the built-in browser, with throwaway test accounts)

| Check | Result |
|---|---|
| Diary with no listens | "No listens yet" message |
| Log a listen (Claude Test Album, 8/10, review) | Saved, opens its detail page with all fields correct |
| Edit: remove the score, change the date and review | Detail page shows "No score," Oct 31, and the new review |
| Log the same album again as "claude test album" / "CLAUDE  TEST ARTIST " | Linked to the **existing** album (one album in the database, confirmed with a read-only query) |
| Diary order | Nov 2 listen above the Oct 31 listen |
| Delete → Cancel | Pop-up closes, listen still there |
| Delete → "Yes, delete" | Back to the diary, listen gone |
| Open a deleted listen, or `/listens/abc/edit` | "Not found" page |
| Second test account opens the first account's listen and its edit page | "Not found" for both. Its diary is empty |
| Phone-size screen (375 px wide) | Form fits with no sideways scrolling |

## Bug caught

The first time I opened `/listens/new`, the dev server showed the "not found" page from the `/listens/[id]` route, as if "new" were a listen id. A production build (`npm run build`) listed the routes correctly, which showed the code was fine and the running dev server had gone stale (it had also logged old errors from earlier). Restarting the dev server fixed it.

**Small quirk noticed:** The first test listen got id 13, not 1. Database id counters keep counting even when a test transaction is undone (the feature 2 privacy check), which is normal Postgres behavior.
