# Prompt log: Test 1, Data isolation

**Agent:** Claude Code (desktop app), Nov 2, 2026
**Issue:** #29 · **Branch:** `test/data-isolation`
**Required test 1** (PLAN.md section 4)

## 1. Where the tests run

> "what are the two required tests? should I start a new chat to do them?"

**Agent:** Listed the two tests from PLAN.md section 4. Suggested staying in this chat, since it already knows the test accounts, the CLI set-up and how I work.

> "what are the benefits to doing it in a test project?"

> "does creating a test project fulfill the assignment?"

**Agent:** Re-read the assignment. It doesn't say *where* tests run. A separate test project fulfills it and matches my plan.
- The main reason for one is the red step. Data isolation comes from the database's privacy rules, so the only honest way to make this test fail is to turn those rules off, which is safe in a test project but not on live data.

> "what if I think its ok to turn the rules off on my live data given i'm the only one thats logged anything?"

**Agent:** Called it a reasonable risk and laid out why:
- Only my data is in the database.
- Logged-out visitors still can't read the tables.
- The rules would be off for about a minute.

The real risk is forgetting to turn them back on. Its safeguards:
- one scripted step that turns them back on automatically
- a check afterwards, plus the 21-check privacy check
- an obviously fake album for the test data
- do it before the stranger test and demo

> "lets do it this way"

**Decision (mine):** Run the tests against the live database with the two throwaway test accounts. **This changes PLAN.md section 4** ("a separate free Supabase test project") and goes in Plan vs. Reality.

## 2. The test

`tests/data-isolation.test.ts` (Vitest, `npm test`). In plain English:

> This test signs in as two real accounts. **User A** (test account 2) logs a listen of a test copy of "In Rainbows". **User B** (test account 1) has logged nothing. Then, signed in as User B, it checks that:
> 1. User B's diary is **empty**, using the same request the diary page makes;
> 2. asking the database **directly for User A's listen by its id** returns nothing;
> 3. User B **can't change or delete** User A's listen (and from User A's side it's still there, unchanged).
>
> A first "set-up check" confirms User A *can* see their own listen, so the test isn't passing just because nothing was saved. At the end the test deletes its listen.

**Agent decisions I went along with:**
- **An obviously fake album**, *"In Rainbows (test)"* by "Recorded Test", instead of the real *In Rainbows*. Test data should never get mixed up with an album I might log.
- **The test prints only listen numbers.** Even when it fails, no album names, reviews, emails or passwords from anyone's account appear.
- **Logins come from `.env.test.local`**, a private file that's never committed. Vitest loads it automatically (`vitest.config.mts`).
- **Updated the Node type definitions** from version 20 to 24. Vitest refused to install alongside the old ones; I run Node 26, so 24 fits.

## 3. Red, then green

**How the feature was broken:** `alter table public.listens disable row level security;`, which switches off the privacy rules on the listens table only. The same terminal command ran the test and then switched the rules back on automatically. The agent then checked that all four tables had their rules on, that no test listens were left, and that my 7 listens were untouched.

| Run | Result | Saved output |
|---|---|---|
| **Red** (rules off for a few seconds) | **3 failed, 1 passed.** User B's "diary" showed all 19 listens in the database; User B could open User A's listen by its id, and change and delete it. The set-up check still passed | `tests/results/data-isolation-red.txt` |
| **Green** (rules back on) | **4 passed** | `tests/results/data-isolation-green.txt` |
| Feature 2's privacy check afterwards | **21 PASS, 0 FAIL** | |

**What would break it:** a change that loosens the listens privacy rules, for example a new rule like "signed-in users can read all listens", added so a feature such as a public feed could show other people's listens, would let User B see User A's listens and make this test fail.

## 4. Mistakes caught

1. **The first red run failed for the wrong reason.** The set-up step checked "User B has logged nothing" by counting every listen User B could see. With the rules off, that was everyone's, so the test stopped at the set-up step and the real checks never ran. That wouldn't have shown the actual protection failing. **Fix:** the set-up step now counts only listens that belong to User B, which is also what "logged nothing" means. I approved a second red run.
2. **The agent wiped the red output.** It ran the green test in the same terminal tab, starting with `clear`, which erased the red output before I could screenshot it. **Fix:** I approved one more red run. This time red and green each got their own tab ("red run", "green run"), and both outputs were also saved to files.

In total the rules were off three times, each for a few seconds, and were confirmed back on every time.
