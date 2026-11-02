# Prompt log: Switching album search to MusicBrainz

**Agent:** Claude Code (desktop app), Nov 2, 2026
**Issue:** #16 · **Branch:** `feature/musicbrainz-search` (built on top of feature 6, PR #15)
**Changes:** custom feature 1 (autofill), after real use

## 1. Finding the problem

While logging my real albums on the live site:

> "one question, why is queens of the stone age perfecth not showing up when I search for it?"

**Agent:**
- Searched iTunes the same way and got 0 results.
- At first it suggested *Perfecth* might not be a real album. That was wrong: the album came out after the agent's knowledge ends. It said so once it checked Apple's full list for the band.
- *Perfecth* (released Oct 30, 2026) **is** in Apple's catalog, but Apple's search doesn't return it. Search also misses *Villains* (2017) and *...Like Clockwork* (2013), which Apple sells too.
- Suggested an "All albums by this artist" button as a fix.

> "It looks like the same issue is happening for reality awaits by the strokes as well"

> "does it make sense to do that instead of switching the search to the non-itunes option?"

**Agent:** Tested both sources on the albums I couldn't find:

| | iTunes search | MusicBrainz |
|---|---|---|
| *Perfecth* | Not found | Found |
| *Reality Awaits* | Only without "the strokes" | Found |
| *Villains* | Not found | Found |
| Typo "strokes realty awaits" | Not found | Found |
| Covers for 5 test albums | Always | All 5 |

**Downsides it listed:**
- about 1 request per second
- genres come from fans' tags and are sometimes blank
- covers come from a second service
- costs about one PR, plus a small database change

> "Switch to MusicBrainz"

**Decision (mine):** Switch. This goes in Plan vs. Reality: real use changed a planned decision.

## 2. Building it

**Database:** a new `musicbrainz_id` column on albums (MusicBrainz ids aren't numbers). `itunes_id` stays, so my first 3 albums keep their iTunes covers.
- The agent's first try at applying it was stopped by a safety check, because it changes the live database. It asked me first.

> "Yes, add the column (Recommended)"

**What changed:**
- `src/lib/musicbrainz.ts` replaces `src/lib/itunes.ts`.
- **Search** runs in the browser. Requests are spaced at least 1.1 seconds apart. If MusicBrainz says it's busy, it waits 2 seconds and tries once more, then shows "MusicBrainz is busy…".
- **Picking an album** fills in title, artist and year right away. The genre arrives a moment later from a second lookup (the fans' most-picked genre, like "Alternative Rock"). Singles are hidden.
- **Saving** works like the iTunes version, but with the MusicBrainz id:
  - albums already in the list are reused without asking MusicBrainz
  - new ones are double-checked with MusicBrainz, using its title and artist
  - if it doesn't answer, nothing is saved and the form says to try again or click **Remove link**
- **Covers:** the server asks the Cover Art Archive where the cover lives and saves that permanent Internet Archive address. It saves no cover if the album has none.
- **Broken images** now fall back to the initials placeholder.
- **Linking a hand-typed album** (when it's later picked from search) adds the cover and fixes the capitals ("rise and shine" → "Rise and Shine").
- **Credit line** under the search box: "Album info from MusicBrainz, covers from the Cover Art Archive."

## 3. Testing (built-in browser, test account, localhost)

I used children's albums for anything saved, so the test data can't collide with albums I'd log.

| Check | Result |
|---|---|
| "queens of the stone age perfecth" | *Perfecth* is the top result |
| "strokes realty awaits" (typo) | *Reality Awaits* is the top result. Picking it filled title, artist, 2026, and then "Alternative Rock" (not saved) |
| Pick and save *Baby Beluga* (Raffi) | Saved in 2.2 seconds with cover, 1980, "Folk" |
| **Tamper:** made-up MusicBrainz id | Saved as typed, with no cover |
| **Tamper:** real id + "Totally Fake Title" | Reused the existing *Baby Beluga* album |
| MusicBrainz unreachable on save (pointed at a fake address, then put back) | "Couldn't check this album…", nothing saved, score and pick kept. **Remove link** then saved it as typed |
| Type *rise and shine / raffi* by hand, then pick it from search | Same album, now with cover and correct capitals |
| Result with no cover in Cover Art Archive | Initials placeholder |
| Edit form | Shows "Filled in from MusicBrainz" for a linked album |
| Phone width | Fits |

A read-only database check showed no duplicates. My 3 real albums were untouched.

## 4. Problems found

1. **Covers load slowly the first time (1.5–8 seconds).**
   - Cover Art Archive sends the browser through 3 addresses, and none tells the browser to keep a copy.
   - **Fix:** the server saves the permanent Internet Archive address, which skips the slowest step (about 0.8 seconds). The album names still show right away.
2. **A save failed with "Couldn't check this album".**
   - In testing, the browser and the server share one computer, so their requests to MusicBrainz added up. The live server is on Vercel's shared machines, so it could happen there too.
   - **Fix:** the server waits and retries once when MusicBrainz says it's busy.
3. **"MusicBrainz is busy" in one search** right after a lot of testing. It recovered after a short wait.
   - **Fix:** a longer wait before the retry (2 seconds).

**The agent's own testing mistakes:**
- **A partly copied id.** It looked up *Villains* with an id it had only partly copied and got "not found". It re-ran the search to get the real id.
- **A test script that went over the limit itself.** A debugging script fired requests too close together, so its results meant nothing. It redid the check one request at a time.
- **A backfill test that tested nothing.** The top search result for "hot potatoes wiggles" was a different album (*LIVE Hot Potatoes!*), so the app correctly made a new album. It redid the test after checking the top result's title first.

## 5. Making covers faster with Vercel's image cache

> "Is there a way to get the album art faster, or is that the best option?"

**Agent:** Timed it:
- Cover Art Archive link: about 1.3 s
- the Internet Archive's final server: about 0.8 s
- Apple's servers, for comparison: about 0.17 s

So skipping redirects can't fix it; covers need copies somewhere fast. It suggested Next.js's built-in image feature, which keeps a resized copy on Vercel's network (copying covers into Supabase storage would be more work).

> "would vercel cacheing them eventually run into storage issues?"

**Agent:** Checked Vercel's current docs. The free plan has no storage limit; it limits work per month:
- 5,000 new resized images (this app would use a few hundred)
- 100,000 cache-write units
- 300,000 cache-read units

Going over is never charged. New images just stop going through the cache, and the app falls back to the cover's own link.

> "Yes, add it"

**What changed:**
- `next.config.ts` allows only the cover sites (listed once in `src/lib/cover-hosts.ts`) and keeps copies for 31 days.
- `AlbumCover` tries, in order: Vercel's cached copy, then the cover's own link, then initials.
- Search results and the picked-album preview skip the cache, since they're only on screen for a moment and would use up the monthly limit.

**Tested (localhost):**

| Check | Result |
|---|---|
| Diary covers | Load through the cache, resized to 64px wide (about 1 KB each instead of 500px images) |
| Repeat view | About 12–15 ms per cover. The cached copy on the server took 2 ms vs 0.3–0.7 s the first time |
| Temporary test page: good cover / broken cover on an allowed site / good image from an unlisted site / broken unlisted image | Cached copy / cache, then own link, then initials / own link / initials |
| The Internet Archive server for *big red car* returned errors for a while | The cache failed after 5.4 s, the cover showed via its own link, and the image worked again directly a minute later |

**Problems found:**
1. **A whole page crashed during development.** Next.js crashes the page when a cover's site isn't on the allowed list, instead of failing just that image. It showed up when the agent briefly removed a site from the list to test the fallback.
   - **Fix:** one shared list of cover sites. Covers from anywhere else skip the cache and use their own link.
2. **Covers switched to their own links even though the cache answered.**
   - The agent's first guess was its own "did the image fail before the page was ready?" check. Next.js's image already does that check itself, so the agent removed its own from cached covers. The covers still switched on the next two loads.
   - Rather than guess again, it measured a clean load: every cover came through the cache in about 15 ms except one whose Internet Archive server was failing. So the earlier failures were most likely the Internet Archive being flaky, not the app.

## 6. Test data to clean up before submission

Test account 2's listens 30–39, and the children's albums it added:
- *Baby Beluga*, *Yummy Yummy*, *Hot Potatoes*, *LIVE Hot Potatoes!*, *big red car*, *Rise and Shine*
- *Claude Tamper MB*
