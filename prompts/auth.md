# Prompt log: Feature 1, sign up and login

**Agent:** Claude Code (desktop app), Nov 2, 2026
**Issue:** #3 · **Branch:** `feature/auth`

## 1. Starting the feature

> "I just merged the PR"

**Agent:**
- Confirmed the plan PR was merged and Issue #1 closed, then opened Issue #3 with the user story from PLAN.md and created the `feature/auth` branch.
- Generated a Next.js 16 project, added the Supabase libraries, and built:
  - sign-up, login, and logout pages
  - a header that shows `@username`
  - a redirect that sends logged-out visitors to the login page
  - a SQL file that creates the `profiles` users table and its privacy rules

**Agent decision I went along with:** Next.js 16 turns on a new caching mode ("Cache Components") by default. The agent turned it off, because nearly every page in Recorded shows the signed-in user's own data, and that mode would add extra loading wrappers around every page that checks who is logged in.

## 2. Supabase setup questions

> "can you please repeat what to do in supabase? and do you think it makes sense to use a "sign in with google" option or something instead of storing passwords? is that allowed by the assignment?"

**Agent:**
- The app never stores passwords itself. Supabase keeps them scrambled (hashed) in its own login system, and our `profiles` table has no password column.
- Google sign-in is probably allowed, since it still creates an account inside the app. But it would make the live demo sign-up awkward, take extra setup in Google's developer console, still need a separate "pick a username" step, and change the merged plan.

> "ok lets not do sign in with google. would you be able to do any of the supabase steps through the CLI?"

**Agent:** Yes. I create the project and log the CLI into my Supabase account myself. The agent then links the project, turns off email confirmation, and runs the SQL files from the repo. I paste the publishable key into `.env.local` myself, so the agent never handles keys or passwords.

**Decisions (mine):**
- Keep email and password sign-in.
- Use the Supabase CLI.
- When creating the project, keep **Data API** on, turn **off** "Automatically expose new tables" (Supabase's own recommendation), and turn **on** "Enable automatic RLS." The agent recommended all three.

## 3. A problem the agent caught

The agent previewed the CLI's settings push before applying it (`supabase config diff`). The default settings file would have changed **14** settings on my project, not just email confirmation. It would also have:

- turned off two-factor login options
- changed database connection limits
- turned on a vector storage feature

**How it was fixed:** The agent edited `supabase/config.toml` to match my project's current values, ran the preview again, and confirmed the only real change left was turning off email confirmation. Then it applied the settings.

## 4. Testing

> "Key added"

**Agent:** Started the app on my computer and tested it in the built-in browser with a throwaway test account. Its details are kept in `.env.test.local`, which Git ignores.

| Check | Result |
|---|---|
| Submit an empty sign-up form | "Pick a username." / "Enter your email." / "Choose a password." |
| Sign up with a new username, email, and password | Went straight to the home page showing "Welcome, @claude_test_1" (the username comes from the new `profiles` row) |
| Open `/login` while logged in | Sent back to the home page |
| Log out | Sent to the login page |
| Open a private page (`/diary`) while logged out | Sent to `/login?next=/diary` |
| Log in with the wrong password | "That email and password don't match. Try again." The email stays filled in |
| Log in with the right password | Home page, logged in |
| Sign up with a taken username (`Claude_Test_1`, different capitals) | "That username is taken." |

There were no errors in the server log or the browser console.

## Difference from the plan

PLAN.md lists the database as feature 2, but the `profiles` users table had to exist for sign-up to work, so it was built here. The other tables (`albums`, `listens`, and `stars`) still come in feature 2.
