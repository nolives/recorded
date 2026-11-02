# Prompt log: Feature 7, search, filter and sort

**Agent:** Claude Code (desktop app), Nov 2, 2026
**Issue:** #18 · **Branch:** `feature/diary-search`
**Spine feature:** search/filter + sort (user story 6 in PLAN.md)

## 1. A question first

> "would it make sense to do the whole search via deezer? regardless, please start feature 7"

**Agent:** Not right now:
- Deezer doesn't let browsers ask it directly, so every search would go through our server.
- Genres would need an extra lookup, and some albums are missing (*Baby Beluga* was).
- It would be a second switch in one day, with another database column and more testing.

MusicBrainz already finds what I search for, so the time is better spent on the remaining required features. Deezer *covers* stay a possible extra if there's time.

**Decision (mine):** stay with MusicBrainz and start feature 7.

## 2. Building it

**What it built (all on the diary page):**
- **Search box:** finds listens by album title **or** artist, ignoring capitals. The list updates after a short pause in typing.
- **Genre menu:** only genres in my own diary, plus "All genres".
- **Sort menu:** Newest first, Oldest first, Highest score, Lowest score.
  - Unscored listens always go **last** when sorting by score (my decision from feature 2).
  - Listens with the same score are sorted newest first.
- **Everything works together** and lives in the page address, like `/diary?q=raffi&genre=Folk&sort=score_high`. So refresh, the Back button and copying the link all keep the filters.
- **"Showing 2 of 10 listens"** while filtering, a **Clear** link, and "No listens match… show everything" when nothing matches.

**Agent decisions I went along with:**
- **The database does the searching**, not the browser, so it stays fast with a long diary.
- **Typed text is made harmless before it reaches the database.**
  - In a search pattern, `%` and `_` mean "anything", so they're escaped. Searching "100%" finds "100%", not every album.
  - Commas, quotes and brackets have meanings in the filter text, so the search goes inside escaped quotes.
- **The address updates without adding a Back step for every letter typed**, so Back goes to the page before the diary, not to "wiggle".
- **Bad addresses are handled.** An unknown `sort=` falls back to newest, and very long searches are cut to 100 characters.
- **Works without JavaScript too.** It's a normal search form, with an Apply button that only shows when JavaScript is off.
- **Screen-reader labels:** the search box and menus are announced as "Search by album or artist", "Genre" and "Sort".

## 3. Testing (built-in browser, test account, localhost)

Setup: gave two test listens a genre ("Children's Music") and scores (9 and 7), and moved two others to October 1 and 15, using the normal Edit form.

| Check | Result |
|---|---|
| Newest / oldest | Today's listens first / Oct 1, then Oct 15, then today's |
| Highest score | 9, 7, 6, 5, 4, then unscored |
| Lowest score | 4, 5, 6, 7, 9, then unscored |
| Search "wiggles" | 5 listens. Matches the artist, including one typed as "the wiggles" |
| Search "BELUGA" | Both *Baby Beluga* listens (capitals ignored) |
| Genre "Folk" | Both *Baby Beluga* listens |
| "raffi" + Children's Music | Both *Rise and Shine* listens |
| Search `a,b(c)"%_\` | "No listens match", no error |
| Search `%` alone, `_` alone | Nothing matches (they aren't treated as "anything") |
| Search "potatoes!" | *LIVE Hot Potatoes!* |
| `sort=hacker` in the address | Falls back to newest first |
| Type "wiggles" in the box | List updates and the cursor stays in the box |
| Pick Highest score from the menu | Address and list update |
| Clear | All boxes empty, all 10 listens |
| Back button after Clear | The search and sort come back, and the boxes match |
| Open a link with filters already in it | The boxes show those filters |
| Phone width (375px) | Search full width, the two menus side by side, nothing cut off |

## 4. Problems found

1. **Clear wouldn't have cleared the boxes.** The agent's first version reset the form to the values it started with, which were the current filters. Caught while reading over the code, before testing. **Fix:** the boxes follow the address whenever it changes (Clear, Back), except while the cursor is in the search box.
2. **The diary crashed with "archive.org is not configured" right after switching Git branches.** The setting was correct, but the running dev server had got confused when the files changed under it. A restart fixed it, and the production build was fine. Same kind of dev-server confusion as in feature 4.
3. **The agent's test script misread some scores.** It glued the release year onto the score ("19806" for 1980 and a score of 6). The app was right; only the script's reading was off.
