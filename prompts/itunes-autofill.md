# Prompt log: Feature 5, iTunes autofill

**Agent:** Claude Code (desktop app), Nov 2, 2026
**Issue:** #12 · **Branch:** `feature/itunes-autofill`
**Custom feature 1 of 3** (moved up from #8; see `prompts/validation.md`)

## 1. Checking the choice of album database

> "I just merged the PR for feature 4. and we still think the itunes autofill is better than the other one you mentioned earlier?"

**Agent:** Ran the same search ("In Rainbows" by Radiohead) on iTunes and on MusicBrainz, the backup option from planning, and compared them:

| | iTunes | MusicBrainz |
|---|---|---|
| One search gives | Title, artist, year, genre **and cover** | Title, artist, year and tags. **No cover**; that needs a second lookup |
| Speed limit | About 20 searches a minute | 1 request per second |
| Genre | One clean label ("Alternative") | User tags ("rock, electronic, post-rock") |
| Key needed | No | No |

- MusicBrainz is better for rare and out-of-print albums. iTunes only has what Apple sells.
- Typing an album in by hand stays as the fallback either way.

> "Yes, use iTunes"

**Decision (mine):** iTunes, as planned.

## 2. How it works

**Agent decisions I went along with:**

- **The search runs in the browser, not on our server.** Apple allows websites to call iTunes directly. That way each person's searches count against their own limit of about 20 a minute, instead of everyone sharing Vercel's servers (which other websites use too).
- **The server double-checks with Apple when saving a new album.** The cover and iTunes id are hidden fields in the page, and anyone can change those. So the server only trusts the iTunes id. It asks Apple for that album and uses Apple's title, artist and cover. A fake id is saved with no cover, and a made-up title can't be saved next to a real album's cover.
- **Albums already in the catalog don't need Apple.** If an album with that iTunes id is already saved, it's reused right away. This means editing a listen never depends on Apple.
- **If Apple doesn't answer when saving a new album,** nothing is saved, and the form says to try again in a minute or click **Remove cover**. Saving it quietly without the cover would have made a coverless album that the next person would reuse.
- **Search results hide singles.** iTunes counts singles as albums, and searching "blonde frank ocean" returned seven Frank Ocean singles. The app asks for 25 results and shows the top 8 albums and EPs.
- **Duplicate listings are merged.** iTunes often lists the explicit and clean versions of an album separately.
- **Covers are saved at 600px.** iTunes gives a 100px link, and the same address serves a sharper version.
- **Typing over a picked title or artist removes the iTunes link,** since it's no longer that album.
- **An album first typed in by hand gets its cover later,** when it's picked from iTunes. Only the person who added it can change it, because of the privacy rules from feature 2.

**Files:**
- `src/lib/itunes.ts` (talking to iTunes)
- `src/components/album-search.tsx` (the search box)
- changes to `listen-form.tsx` and `actions.ts`

**Something I learned:** Apple lists Frank Ocean's album as **"Blond"**, not "Blonde", so the search only finds it with Apple's spelling.

## 3. Testing (built-in browser, throwaway test account, localhost)

| Check | Result |
|---|---|
| Search "sza sos", pick *SOS* | Title, artist, year (2022) and genre (R&B/Soul) filled in. The cover shows, and the cursor moves to Score |
| Press Enter in the search box | Picks the top result instead of submitting the form |
| Save it | Listen page shows the cover |
| **Tamper:** fake iTunes id + a cover from another website, injected into the page | Saved with **no cover and no id** |
| **Tamper:** real id for *In Rainbows* + title "Totally Fake Title" | Saved as **In Rainbows / Radiohead** with Apple's cover |
| Pick an album, then type in the title | iTunes link and cover removed; other fields kept |
| Type "sos" / "  sza " by hand | Reused the existing *SOS* album with its cover (no duplicate) |
| Edit the *SOS* listen's score | Album and cover unchanged |
| **Remove cover**, then save *Ctrl* | Saved without a cover |
| Pick *Ctrl* from iTunes later | The same album got its cover (no duplicate) |
| Server can't reach Apple (pointed at a fake address for one test, then put back) | "Couldn't check this album with iTunes just now…", nothing saved, pick kept |
| Phone width (375px) | Fits after a fix (below) |

A read-only database check afterward showed no duplicate albums.

## 4. Bugs caught while testing

1. **Apple's speed limit showed up as a confusing error.** After about 20 searches in a minute (the agent's testing plus its command-line checks), Apple answered "too many requests". That answer doesn't include the header that lets websites read it, so the browser reported a blocked request instead.
   - **Fix:** the message now says iTunes may be busy and to try again in a minute.
   - Searching the same words twice on a page reuses the first results.
2. **The score was lost after a failed save. This bug was from feature 4.** Every other field kept what you typed, but Score reset to "No score".
   - React only reads a dropdown's starting value when it first appears, and the form reset afterward put the old one back.
   - Feature 4's tests missed it: on the Edit form the score was already the starting value, and on the Log form the test didn't check the score.
   - **Fix:** the dropdown is rebuilt after each save attempt. Checked with a failed validation and with iTunes being unreachable.
3. **The page was wider than a phone screen when results had long names** (542px on a 375px screen).
   - Form sections (`<fieldset>`) grow to fit their widest content by default.
   - **Fix:** told them not to. Long names now end in "…".

## 5. Test data to clean up before submission

Listens 16–22 and the albums the test account added:
- *SOS*, *In Rainbows*, *The Fame*, *Ctrl*
- *Claude Tamper Test*
