# Prompt log: Stranger-test fix, search by artist

**Agent:** Claude Code (desktop app), Nov 3, 2026
**Issue:** #33 · **Branch:** `feature/search-by-artist`
**The stranger test's fix PR** (reflection question 2)

## 1. The stranger test

I gave the live app to someone not in the class. They signed up for their own account and used it for 10 minutes while I watched without helping.

> "i got two pieces of feedback from the stranger test: one, to be able to favorite when you're logging an album and two, is it possible for the MusicBrainz search to have a toggle where you can search either the name of the album or the name of the artist and have their albums pop up?"

**Agent:** Both are fixable. The first is exactly backlog #20, which I had held back to see if the stranger test raised it. It suggested picking the fix by **how much each one blocked them**: if they got stuck finding an album, the search is more important, since the favorite button already has a workaround (the Favorite button on the listen page). It also reminded me the reflection asks for a **top 3**.

> "the album search definitely held them back more. they also thought the home page when you go to the site was bare-bones"

**Their top 3 struggles:**

| # | Struggle | What I'm doing |
|---|---|---|
| 1 | Couldn't find albums by artist (the search only takes "album and artist" words together) | **Fixed (this PR):** it blocked the main task, logging a listen |
| 2 | Wanted to favorite while logging | Backlog #20; a bonus PR if there's time |
| 3 | The home page felt bare-bones | **Decided not to fix:** it's cosmetic, it doesn't stop anyone signing up, and the time is better spent on the demo |

**Decision (mine):** fix the search.

## 2. What changed

- **An Album / Artist toggle** above "Find the album".
  - **Album** works like before.
  - **Artist** is two steps. Type a name and pick the artist from a short list, where MusicBrainz's notes tell same-named artists apart ("Group · US", "Queens of the Stone Age tribute band", "Canadian singer/songwriter/author"). Then their albums appear **newest first**, with covers.
- **Studio albums and EPs by default.** The band's full list has 45 entries, 31 of them live albums or compilations, so those sit behind "Show live albums and compilations (31)".
- **"← Other artists"** goes back to the artist list. Artists and album lists already loaded on the page aren't fetched again.
- **Picking an album works exactly like Album mode:** title, artist, year and cover, then the genre a moment later.
- **A hint in Album mode:** "Looking for one artist's albums? Switch to Artist." Testing showed why: "the strokes" in Album mode finds tribute albums (*VSQ Performs The Strokes*, a bluegrass tribute), not their actual albums. That's the stranger's problem exactly, and the toggle is easy to miss.
- **More patient when MusicBrainz is busy** (see below).

## 3. Testing (built-in browser, test account 2, localhost)

| Check | Result |
|---|---|
| Artist: "queens of the stone age" | Band first ("Group · US"), then tribute bands and Josh Homme |
| Pick the band | 14 studio albums and EPs, newest first: *Perfecth* (2026), *Run Away From the Mob*, *In Times New Roman…*, *Villains*… |
| Show / hide live albums and compilations | 45 with them (labeled "· Live" and so on), back to 14 without |
| ← Other artists | Back to the artist list |
| Pick the band again | Loads instantly (already fetched) |
| Pick *Villains* | Title, artist, 2017, then "Alternative Rock"; cursor moves to Score |
| Artist: "the strokes" | *Reality Awaits* (2026) at the top |
| Switch to Album with "the strokes" still typed | Searches again in Album mode: tribute albums (which is why the hint was added) |
| Toggle with the keyboard | Tab to it, Space picks Artist |
| Phone width | Fits; three Raffis told apart; his albums newest first |
| Save from Artist mode (*Baby Beluga*) | Saved, and it reused the existing album (checked in the database) |

The two required tests still pass (`npm test`, 6/6).

## 4. Problem found: MusicBrainz overloaded

Halfway through testing, every search said "MusicBrainz is busy", even after waiting 15 seconds. The agent checked MusicBrainz directly: one request worked, and the next was refused with `x-ratelimit-zone: global`. That means **MusicBrainz as a whole** was overloaded, for every user, not just this app. It comes and goes.

The app used to retry once after 2 seconds and then give up. **Fix:** the search (in the browser) and the server's check when saving now retry **up to 3 times, waiting a little longer each time** (about 1.5, then 3, then 4.5 seconds). The next test rode it out without a message. This matters for the live demo, where I can't control MusicBrainz's load.
