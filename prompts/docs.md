# Prompt log: README and Plan vs. Reality

**Agent:** Claude Code (desktop app), Nov 3, 2026
**Issue:** #36 · **Branch:** `docs/readme-plan-vs-reality`

## 1. Staying in this chat

> "should I start the docs in a new chat since the context window in this one is filling up?"

**Agent:** No need. Long conversations get summarized automatically, and Plan vs. Reality depends on this chat's history: who decided what, and why. Everything is also written down in the repo (prompt logs, PRs, `schema.md`, Git history), and it would draft from those files anyway, so the table quotes evidence rather than memory.

> "I merged it, please begin on the readme and plan vs reality"

## 2. How it was written

- **The original PLAN.md was left exactly as it was.** Plan vs. Reality is only added at the bottom, as the assignment says. The agent checked: 0 lines changed, 31 added.
- **"Who decided" for every row** came from the "Decision (mine)" and "Agent decisions I went along with" lines in each prompt log, pulled out with a search, not from memory.
- **Two honest findings** while doing that:
  - **The chart was built without Recharts**, the library my plan named, and **that switch was never discussed with me.** It shows up only as an agent decision I went along with in the dashboard log. It's marked **(agent)**.
  - **The "prefer albums not played in 30 days" rule** in random re-listen was the agent's interpretation of my user story, also marked **(agent)**.
- **A mistake in my original plan**, now noted: section 3 says "Five tables" but describes four (plus Supabase's own login table).
- **README:**
  - what the app does
  - the live URL
  - the tools and why each one is there
  - how to run it, including the database set-up and the tests
  - where things are in the code
  - a new `.env.test.example` with placeholder test logins (no real ones), so someone else can run `npm test`
- **Two set-up steps corrected before committing:**
  - `supabase db push` needs `--remote` in this CLI version, or it looks for a local database.
  - `config push` was taken out, because it would copy *my* site address into someone else's project.
