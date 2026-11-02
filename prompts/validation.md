# Prompt log: Feature 4, validation

**Agent:** Claude Code (desktop app), Nov 2, 2026
**Issue:** #10 · **Branch:** `feature/validation`

## 1. Changing the build order

> "i'll merge it. can I wait to log the albums until we get the itunes autofill?"

**Agent:**
- Yes, but suggested moving autofill earlier:
  - Stars, search and sort, and the dashboard are easier to test and demo with real albums.
  - Validation and autofill both change the same "Log a listen" form.
  - Leaving autofill last risks typing my 5 real entries in a rush on Wednesday morning.
- The tradeoff: the graded spine features come one step later.

> "I merged it, and lets move the itunes autofill to 5"

**Decision (mine):** New build order, which differs from PLAN.md section 2 and goes in Plan vs. Reality:

| # | Feature |
|---|---|
| 4 | Validation |
| **5** | **iTunes autofill** (was 8) |
| 6 | Stars |
| 7 | Search and sort |
| 8 | Dashboard |
| 9 | Random re-listen |
| 10 | Sharing settings |

## 2. Building validation

**Agent:** Opened Issue #10 and built:

- **`src/lib/validation.ts`:** one function, `validateListen`, that checks a listen and returns a friendly message for each field that needs fixing:

  | Problem | Message |
  |---|---|
  | Blank album title | "Enter the album title." |
  | Blank artist (including just spaces) | "Enter the artist." |
  | Blank date | "Pick the date you listened." |
  | Date that doesn't exist | "That isn't a real date." |
  | Date in the future | "That date is in the future." |
  | Release year outside 1900 to next year | "Enter a year between 1900 and 2027, or leave it blank." |
  | Score that isn't a whole number from 1 to 10 | "Pick a score from 1 to 10, or No score." |
  | Review over 2,000 characters | "Keep reviews under 2,000 characters (yours is 2,100)." |
  | Genre over 60 characters | "Keep the genre under 60 characters." |

- **The checks run on the server,** in the save and edit actions, before anything touches the database. They can't be skipped by changing the page in the browser. The database rules from feature 2 are a second layer behind them.
- **The form:**
  - each message appears under its field, with a red outline
  - a summary at the top ("Fix the 3 highlighted fields to save.")
  - the cursor jumps to the first field with a problem
  - everything typed stays filled in
  - a live "0 / 2,000" character counter for reviews

**Agent decisions I went along with:**
- The future-date check allows one extra day, because the server's clock (UTC) is already "tomorrow" during a California evening.
- Added a 60-character genre limit, which isn't in the plan.
- The browser's own pop-up warnings are turned off (`noValidate`), so every message is the friendly one from the app.

**Lint fix:** The React linter flagged the first version of the review counter for updating state inside an effect, which can cause extra re-renders. The agent switched to React's recommended pattern.

## 3. Testing (built-in browser, throwaway test account)

| Check | Result |
|---|---|
| Submit a completely empty form (date cleared too) | "Fix the 3 highlighted fields to save." Title, artist, and date messages, with the cursor on Album title |
| Artist = spaces only, year 1800, date 2030-01-01, 2,100-character review | 4 messages, the counter shows "2,100 / 2,000", the title/genre/year/date/review typed stay filled in, and the cursor is on Artist |
| **Bypassing the browser:** changed the score dropdown in the page to send "11" | The server replied "Pick a score from 1 to 10, or No score." |
| Fixed everything (score 7) | Saved and opened the new listen |
| Edit form: cleared the title | "Enter the album title." Artist, score, and review stayed filled in, and the saved listen was unchanged |

There were no server errors.

**A mistake in my agent's test (not an app bug):** The first test script clicked "the first submit button on the page," which was the header's **Log out** button, so it logged the test account out. The agent noticed from the server log (`logOut()` ran instead of saving), logged back in, and aimed at the form's own Save button.

**Dev server noise explained:** The dev server log showed "Module not found" errors for `/listens/new`. They happened when Git briefly switched to the old `main` (before pulling feature 3), which removed files the running dev server was watching. A clean production build passed, so the code is fine.
