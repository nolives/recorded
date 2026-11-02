# Prompt log: Feature 2, data model

**Agent:** Claude Code (desktop app), Nov 2, 2026
**Issue:** #5 · **Branch:** `feature/data-model`

## 1. Getting the live site up (between features 1 and 2)

> "are you able to do any of that in a vercel CLI or should I do it myself?"

**Agent:**
- Created the Vercel project with the CLI and connected it to GitHub (after I installed Vercel's GitHub app on just the `recorded` repo).
- Added the Supabase URL variable. I pasted the publishable key myself in a terminal prompt.
- Deployed only the files committed on `main`, so `.env.local` and the assignment PDF couldn't be uploaded.

**Bug:** The first deploy failed with "No Output Directory named 'public'". The project had been created without the Next.js framework preset. The agent set the preset with `vercel project update --framework nextjs` and redeployed successfully.

> "can we change the address first? what would be the best address to have?"

**Agent:** Checked which `.vercel.app` names were free and suggested three. I picked **recorded-albums.vercel.app**. The agent added it to the project, pointed Supabase's login settings at it (this PR includes that `supabase/config.toml` change), and set it as the GitHub repo's website.

I then signed up for my real account on the live site, and it worked.

## 2. Building the tables

> "Worked, start feature 2"

**Agent:**
- Opened Issue #5 and wrote [`supabase/migrations/20261102000002_albums_listens_stars.sql`](../supabase/migrations/20261102000002_albums_listens_stars.sql), which creates:
  - `albums` (shared)
  - `listens` (private)
  - `stars` (junction table, private)
- Each table has Row Level Security and database rules for required fields.
- Applied it with `supabase db push`.
- Wrote `schema.md`.

**Agent decisions I went along with (not in the plan):**
- Reviews are limited to 2,000 characters.
- Nobody can delete a shared album, because other users' listens may point to it.

## 3. Changing my plan

> "a couple things: would a feature be to change your profile between public and private? so if its public anyone can see your listening history, if its private either no one can see it or only with a specfiic sharable link. and for the logging requirement, I think I want to make it so you can log an album without necessarily rating it"

**Agent:** Asked three multiple-choice questions. My answers:

- **Sharing:** three settings, **Private / Link only / Public**, instead of the plan's public on/off switch. This becomes feature 10. The agent warned that feature 10 was already my riskiest feature, so if time runs short I'll build Private/Public first and add the secret link after.
- **Scores:** optional. Album, artist, and date stay required.
- **Unscored listens:** left out of the average score, score sorting, and the random re-listen pick. They still count in total listens and the monthly chart.

**Decisions (mine).** The plan was already merged, so instead of rewriting it, the agent:
- added a new SQL file ([`20261102000003_optional_score.sql`](../supabase/migrations/20261102000003_optional_score.sql)) rather than editing the one already applied
- noted both changes in `schema.md` and Issue #5

They'll go in the Plan vs. Reality table at the end.

## 4. Checking the privacy rules

The Supabase CLI wouldn't run SQL that writes to my live database without my permission. The agent explained the check first.

> "Yes, run it"

**Agent:** Ran [`supabase/checks/rls_check.sql`](../supabase/checks/rls_check.sql) inside a transaction that is undone at the end. It:
- creates two pretend users, A and B
- has A add an album, a scored listen, an unscored listen, and a star
- tries invalid data
- has B try to read and change A's data

**21 of 21 checks passed:**

- A sees their own listens and star.
- Blocked by the database: a score of 11, a score of 0, a missing listen date, a blank album title, and starring the same album twice.
- A listen with **no score** is accepted.
- B sees **0** of A's listens, **0** of A's stars, and can't see A's profile, but can read the shared album.
- B's attempts to change or delete A's listen or star, edit A's album, or add a listen to A's diary all failed.
- Nobody can delete a shared album.
- A's data is unchanged afterward.

A read-only follow-up confirmed nothing was left behind (0 test users, 0 test albums). The check was run twice, the second time only to print the results more readably.
