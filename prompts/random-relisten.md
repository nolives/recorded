# Prompt log: Feature 9, Random re-listen

**Agent:** Claude Code (desktop app), Nov 2, 2026
**Issue:** #25 · **Branch:** `feature/random-relisten`
**Custom feature 2 of 3** (user story 9 in PLAN.md)

## 0. Follow-up from the violet change

> "I just merged both"

**Agent:** Opened the live site in the built-in browser, which isn't signed in there, and looked at the three logged-out pages the violet PR couldn't check (landing, log in, sign up). All three show violet buttons, links and the logo dot correctly.

## 1. Building it

> "Start feature 9"

**What it built:** a "Pick a re-listen" card at the top of the diary.
- Press the button and it shows one of my albums scored 8 or higher: the cover, "You gave it 10/10 · last listened Aug 15, 2026 (79 days ago)".
- **Pick another** gives a different one.
- **Log a listen** opens the Log form already filled in with that album (`/listens/new?album=20`), so after re-listening I just add the score and save.
- **Last listen** opens my most recent listen of it.
- If nothing is scored 8 or higher, it says so.

**The choosing rules** (`chooseRelisten` in `src/lib/relisten.ts`, one plain function):
1. Candidates are albums with at least one listen scored **8 or higher**. Unscored listens never count (decided in feature 2).
2. **Pick another** never shows the same album twice in a row, unless it's the only candidate.
3. It **prefers albums I haven't logged in the last 30 days**, the "haven't played in a while" part of my user story. If every candidate is recent, it picks from all of them.
4. Among those, each album is equally likely.

**Agent decisions I went along with:**
- "Last listened" counts a listen of any score, so an album I played yesterday without scoring isn't treated as forgotten.
- The random number is passed into the function, so a test can control it and check every rule.
- The "today / yesterday / 79 days ago" label is worked out in my browser on my own calendar (see bug 1).
- An odd `?album=` in the address (letters, a negative number, an id that doesn't exist) just gives an empty form.

## 2. Testing (built-in browser, test account, localhost)

Setup with the normal Edit form: *Yummy Yummy* got 10/10 and was moved back to Aug 15 (79 days ago); *Baby Beluga* got 8/10 (last listened today). With *big red car*'s 9/10, that's 3 candidates, and only *Yummy Yummy* isn't recent.

| Check | Result |
|---|---|
| First pick | *Yummy Yummy* (the only one not played in 30 days) |
| Pick another, 7 times | Never the same album twice in a row. Skipping *Yummy Yummy* falls back to the recent ones, then it comes back |
| Log a listen from the pick | Form filled with *Yummy Yummy*, The Wiggles, 1994, the MusicBrainz link and today's date |
| Save it | Saved, and the database shows the **same** album (now 2 listens, no copy) |
| `?album=abc`, `999999999`, `-1`, `20abc` | Empty form, no error |
| Phone width | Card fits, links beside the album |

The "nothing scored 8 or higher" message couldn't be tried in the browser, because every test album now has high scores. The rule behind it (no candidates means no pick) will be covered by a test.

## 3. Problems found

1. **"Yesterday" for an album played today.** The server counts days on UTC time, and on a California evening it's already tomorrow there. **Fix:** the label is worked out in my own browser. The 30-day rule stays on the server, where one day doesn't matter.
2. **An empty gap between the diary's filters and the list on phones** (from feature 7). The row that holds **Clear** and "Updating…" took up space even when empty. **Fix:** on phones it only takes space when something's in it.
3. **The dev server showed amber again** halfway through testing, even though the code (and the live site) is violet. It had kept an old copy of the stylesheet after Git branch switches. A restart fixed it; this keeps happening with the dev server today, but it never affects the live site.
