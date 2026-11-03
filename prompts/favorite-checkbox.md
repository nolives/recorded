# Prompt log: Favorite checkbox on the Log and Edit forms

**Agent:** Claude Code (desktop app), Nov 3, 2026
**Issue:** #20 (backlog, then brought in by the stranger test) · **Branch:** `feature/favorite-checkbox`

## 1. Why now

During feature 8 I asked:

> "one other thing, does it make sense to add the functionality to favorite an album when you log it?"

and decided:

> "dashboard first, we can also hold off on the favorites checkbox to see if thats feedback I get during the app test"

The stranger test brought it up (struggle #2: "be able to favorite when you're logging an album"). After the search fix (#34), I asked for it:

> "Favorite checkbox"

**Decision (mine):** build it. Holding it back until a real user asked for it turned out to be the right call: the idea wasn't only mine.

## 2. What changed

- **Log form:** a "☆ Add to favorites (stars the album)" box under Date and Score. Ticking it stars the album when the listen is saved. **Leaving it unticked never removes a star** the album already has, since logging a favorite again shouldn't unstar it.
- **Edit form:** the box is labeled "Favorite (untick to remove the album from your favorites)" and starts ticked if the album already is one, so it can add **or** remove the star.
- **Like the score, the tick survives a failed save** (same key trick from feature 5).
- **If the star fails to save, the listen is still saved,** and the Favorite button on the listen's page still works.

## 3. Testing (built-in browser, test account 2, localhost)

| Check | Result |
|---|---|
| Log *Rise and Shine* with the box ticked | Saved; its page shows Favorite on |
| Log *Yummy Yummy* (already a favorite) with the box unticked | Still a favorite |
| Edit the *Rise and Shine* listen | Box shows "Favorite", already ticked |
| Untick and save | Favorite off; Favorites page back to just *Yummy Yummy* |
| Tick the box, leave the title empty, save | "Enter the album title."; box still ticked, artist kept |

Lint, type check and production build pass, and `npm test` passes 6/6.

**A slip the agent caught:** a scripted edit to the save code left a meaningless `if (false) { … }` block behind (a leftover of how it inserted the new lines). It spotted it straight away in the output and removed it before testing.
