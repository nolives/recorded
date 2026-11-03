# Prompt log: Feature 10, Shareable profile page

**Agent:** Claude Code (desktop app), Nov 2, 2026
**Issue:** #27 · **Branch:** `feature/profile-sharing`
**Custom feature 3 of 3** (user story 10 in PLAN.md, changed in feature 2 and again here)

## 1. Deciding what to share

> "does it make sense to create a profile page with the top 5 and recent activity and that can be sharable, or diary sharable, or both?"

**Agent:** Both, but as **one page**: a profile at `/u/<username>` with quick stats, the Favorites shelf, recent listens, and the full diary further down.
- It's what people actually send a friend (the Letterboxd model).
- One page means **one** sharing setting, so there's one thing to keep private and test, instead of two.
- It shows features 6, 8 and 9 in one place for the demo.
- A curated Top 5 needs a way to pick and order 5 albums plus another database change, so it stays as backlog #7. The Favorites shelf covers it for now.

> "yes, please build it as one profile page"

**Decision (mine):** one profile page, three sharing settings, Top 5 later.

## 2. The database change

> "Yes, apply it (Recommended)" (asked before changing the live database)

Migration `20261102000005_profile_sharing.sql`:
- **Replaced `is_public` (on/off) with `sharing`** (`private` / `link` / `public`, default `private`) plus **`share_token`**, the secret part of a Link only link. A read-only check first confirmed no account had `is_public` turned on, so nothing was lost.
- **Signed-in users can now only change `display_name`, `sharing` and `share_token`** on their own row. Before this, the database let people edit every column of their own profile, including `username`, by calling it directly. Found while planning this feature.
- **Visitors never read the tables.** Three functions return what a profile page shows: `shared_profile`, `shared_listens` and `shared_favorites`.
  - Each first asks an internal check (`visible_profile_id`) whether the viewer is allowed: the profile is public, or it's link-only with the right key, or the viewer is the owner.
  - If not, it returns **nothing at all**, so a private profile looks exactly like a username that doesn't exist.
  - Nobody can call the internal check directly, and `share_token` is never returned.

## 3. The app

- **Settings page** (`/settings`, via your @username in the header or "Sharing settings" on your own profile):
  - three choices, each with a one-line explanation
  - your link with **Copy**
  - for Link only, **Reset link**
- **Profile page** (`/u/<username>`, **Profile** in the header):
  - name, "On Recorded since November 2026", and 3 stats (reusing the dashboard math)
  - the Favorites shelf
  - the latest 10 listens with reviews
  - "Full diary" for everything else
- **Your own profile** shows a note at the top: "This is your profile. Private: only you can see it." with a link to the settings.
- **The sign-in gatekeeper** (`proxy.ts`) now lets logged-out visitors open `/u/…` pages; the page itself decides whether that profile is shared.
- **Search engines are told not to list profiles.** People share them on purpose, so reviews don't end up in Google.

## 4. Testing

**Privacy check with two accounts plus a logged-out visitor** (`supabase/checks/profile_privacy.mjs`). It signs in by itself without showing the passwords, and **all 18 checks passed**:

| Setting | Visitor | Other user | Owner |
|---|---|---|---|
| Private | Nothing | Nothing | Sees it (and it's marked as theirs) |
| Public | Sees it | Sees it | Sees it |
| Link only, no key / wrong key / old key after reset | Nothing | | |
| Link only, right key | Sees it | | |
| Back to Private, with the old right key | Nothing | | |

**Also checked:**
- a visitor can't call the internal check or read any table directly
- the owner can't rename themselves through the API
- the other user can't change test account 2's setting
- capital letters in the address still work

**In the browser and as a logged-out visitor (localhost):**

| Check | Result |
|---|---|
| Visitor opens a Private profile, my real account (`nolives`, Private by default), an unknown name, or a bad name | All four give the same "not found" page (404) |
| Visitor opens `/settings` | Sent to log in |
| Settings → Public → Save | "Saved.", link `/u/claude_test_2`; visitor gets the page, without the owner note or the key, and with "don't index" |
| Settings → Link only → Save | Link with `?key=…`; visitor: no key 404, right key 200, wrong key 404, "not-a-key" 404 |
| Reset link | "New link made. The old link no longer works."; old key 404, new key 200 |
| Back to Private | The last good key now gives 404 |
| Copy | See bug 1 |
| Phone width | 5 header links fit; profile and Settings fit |

Test account 2 was set back to **Private** at the end.

## 5. Problems found

1. **Copy didn't work, and said nothing.** The in-app browser blocks the normal clipboard method, and the first version failed silently. **Fix:** it falls back to an older copy method, which worked ("Copied"). If both are blocked, it selects the link and says "press Ctrl+C (⌘C on a Mac)".
2. **The Public card looked highlighted while Link only was picked**, in one screenshot. The agent checked the page and found only Link only was selected and highlighted. The mouse had been hovering over Public when the screenshot was taken. Not a bug.
3. **A type error for the new `/u/[username]` page.** Next.js generates its list of pages, and the list was out of date. Regenerating it (`next typegen`) fixed it.
