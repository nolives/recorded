# Recorded

**A diary for the albums you listen to.** Log every listen with an optional score out of 10 and a short review, keep a shelf of all-time favorites, and see your listening habits over time. Think Letterboxd, but for albums.

**Live app:** https://recorded-albums.vercel.app

Built for an intro-to-coding class as a solo project, one feature at a time, each through an Issue, a branch, a prompt log and a pull request. See [PLAN.md](PLAN.md) for the original plan and how it changed (Plan vs. Reality at the bottom), and [schema.md](schema.md) for the database.

## What you can do

| | |
|---|---|
| **Sign up and log in** | Email, password and a username. Every account only ever sees its own diary |
| **Log a listen** | Search for the album (by album or by artist) and the title, artist, year, genre and cover fill themselves in. Add the date, an optional score, a review, and tick "Add to favorites". Typing it in by hand works too |
| **Diary** | Every listen, newest first. Search by album or artist, filter by genre, sort by date or score. Open, edit, or delete a listen (with an "Are you sure?") |
| **Favorites** | Star an album as an all-time favorite; see them all as a shelf of covers |
| **Stats** | Total listens, average score, top genre, and a chart of listens per month |
| **Pick a re-listen** | Can't decide what to play? It picks an album you scored 8 or higher, preferring ones you haven't logged in a while |
| **Profile** | `/u/<username>` with your stats, favorites, recent listens and full diary. Choose who can see it: **Private** (default), **Link only** (a secret, resettable link) or **Public** |

## Built with

| Tool | What it's for |
|---|---|
| [Next.js 16](https://nextjs.org) (React, TypeScript) | The app: pages and server code in one project |
| [Supabase](https://supabase.com) (Postgres + Auth) | The database and sign-up/login. Row Level Security makes the database itself enforce "each user sees only their own data" |
| [Vercel](https://vercel.com) | Hosting. Every merge into `main` redeploys the live site; covers go through Vercel's image cache |
| [Tailwind CSS](https://tailwindcss.com) | Styling (a dark theme with a violet accent) |
| [MusicBrainz](https://musicbrainz.org) + [Cover Art Archive](https://coverartarchive.org) | Free album data and covers for the search (no key needed) |
| [Vitest](https://vitest.dev) | The two automated tests |
| [Claude Code](https://claude.com/claude-code) | The AI coding agent that built it with me; my key prompts are in [`prompts/`](prompts) |

## Run it yourself

You need [Node.js](https://nodejs.org) 22 or newer and a free [Supabase](https://supabase.com) project.

1. **Get the code and install:**
   ```bash
   git clone https://github.com/nolives/recorded.git
   cd recorded
   npm install
   ```
2. **Connect your Supabase project.** Copy `.env.example` to `.env.local` and fill in your project's URL and publishable key (Supabase → Project Settings → API Keys).
3. **Create the tables and privacy rules.** Log the Supabase CLI in and link it to your project, then apply the migrations in `supabase/migrations/`:
   ```bash
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push --remote
   ```
   In Supabase → Authentication → Sign In / Providers → Email, turn off **Confirm email** so new accounts can log in right away.
4. **Start it:**
   ```bash
   npm run dev
   ```
   Then open http://localhost:3000 and sign up.

## Tests

Two automated tests, matching section 4 of [PLAN.md](PLAN.md). They sign in as two real test accounts, so the real privacy rules are what's being tested:

- **Data isolation** (`tests/data-isolation.test.ts`): User B's diary is empty and User B can't see, change or delete User A's listen. [PR #30](https://github.com/nolives/recorded/pull/30)
- **Dashboard average** (`tests/dashboard-average.test.ts`): with scores of 7, 8 and 10 (and another user's 2), User A's average is 8.3. [PR #32](https://github.com/nolives/recorded/pull/32)

To run them: sign up two throwaway accounts in the app, copy `.env.test.example` to `.env.test.local` with their logins, then:

```bash
npm test
```

The tests create their own listens on an obviously fake album ("In Rainbows (test)") and delete them when they finish. Saved red/green runs are in [`tests/results/`](tests/results).

There are also privacy checks in [`supabase/checks/`](supabase/checks), run during development: `rls_check.sql` (21 checks on the tables' privacy rules), `stars_privacy.mjs` and `profile_privacy.mjs` (18 checks on sharing settings).

## Where things are

```
src/app/            pages: diary, listens, favorites, dashboard (Stats), settings, u/[username] (profiles)
src/components/     the forms, album search, chart, cover, star button, …
src/lib/            stats math, re-listen rules, MusicBrainz lookups, validation, Supabase connections
supabase/           migrations (the database), checks (privacy tests), config
tests/              the two Vitest tests and their saved red/green output
prompts/            my prompt log for every feature
PLAN.md, schema.md  the plan (with Plan vs. Reality) and the database design
```
