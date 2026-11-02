# Prompt log: PLAN.md

**Agent:** Claude Code (desktop app), Nov 2, 2026
**Issue:** #1 · **Branch:** `docs/plan`

These are my key prompts, quoted as I typed them, plus a short summary of each answer and who made each decision.

## 1. Reading the assignment

> "Hello claude. I have an assignment to build a solo app for my intro to coding class. can you please read the assignment requirements before we get started?"

**Agent:** Read the assignment PDF and summarized it: the spine features, the feature loop, the tests, the docs, the demo, and the grading. It asked what I wanted to track.

## 2. Choosing the idea

> "a couple of ideas I was thinking of would be an app where you can log albums you've listened to and rate them (like letterboxd), or an app that you can track, find, and rate/review restaurants you've been to. are either feasible?"

**Agent:** Both are doable. It leaned toward the album log: I'd use it more often, the data is easy to enter, and the dashboard would have more to show. It warned that "finding" new restaurants needs a paid or key-based API.

> "for the album app, would it be possible to connect to a databases of albums so the albums get filled in automatically instead of having to type in everything by hand?"

**Agent:** Yes. It tested the free iTunes Search API live: searching "In Rainbows" returned the title, artist, genre, release year, track count, and cover art, with no key needed. It suggested making autofill one of my 3 features and building it after the basics, with manual entry kept as a fallback.

> "before we commit, could you check if a restaurant lookup app would be able to access a restaurant database for free or if that would cost money?"

**Agent:** Free basics are possible through OpenStreetMap; it tested real downtown Berkeley results. Google Places, Yelp, and Foursquare have free allowances but need sign-up or a credit card, and their terms are unclear.

> "which do you think the better option would be? and for the entries, I could back-log them right? and enter albums/restaurants from the past few weeks?"

**Agent:** Recommended the album log. It said back-logging real past listens counts as real data, as long as the listen date is a field I fill in, not one the app sets to today.

> "hold on, I want to confirm something before deciding the app. it seems like both a restaurant tracker and album tracker app already exists, but beli seems to be more popular than any album tracking app, right?"

**Agent:** Yes, Beli looks more popular than any single album app, but the assignment doesn't require a new idea. Because no album app clearly leads, my own album app is more likely to be the one I actually use.

**Decision (mine):** Album log.

## 3. Choosing the tools

> "before I decide, can you look at my public github repos (username nolives) and see the hosting sites I've used for my other class project apps?"

**Agent:** Found that I'd used Vercel and Neon twice (networkingtracker and the Spotify review dashboard) and Replit for my portfolio, with no public Supabase project.

> "putting aside any familiarity with neon, would supabase + vercel or neon + vercel be the better choice?"

**Agent:** A slight edge to Supabase + Vercel: an all-in-one dashboard, a more established login system, built-in file storage, and AI agents know it well. The catch is that free Supabase projects pause after a week without use. It also said to turn off email confirmation so a live sign-up works during the demo.

**Decision (mine):** Supabase + Vercel, in a public GitHub repo.

## 4. Plan details

The agent asked multiple-choice questions. My answers:

- **Entries:** Every listen counts (a diary, like Letterboxd), not one entry per album.
- **Ratings:** A score out of 10. I picked this over the agent's suggestion of half stars.
- **Stars:** All-time favorites.
- **My 3 features:** iTunes album autofill, a random re-listen button, and a public profile link.
- **Name:** "Recorded" (my idea, because the app is about records; still a working title).
- **Use:** A few times a week.
- **Design:** Dark and moody.
- **Albums:** One shared album list for all users, with listens, scores, and reviews private to each user.

## 5. Drafting PLAN.md

**Agent:** Wrote the first draft of PLAN.md from my answers. It pointed out the parts it had guessed so I could check them:

- The pitch's "because" sentence
- The random re-listen threshold (8 or higher)
- The amber accent color (`#F5A524`)
- What the public profile shows
- Naming the users table `profiles`
- The public profile link as the first feature to cut

> "the plan looks good to me."

**Decision (mine):** Approved the draft without changes, including the parts the agent guessed.

## 6. A tool I decided not to add

> "one thing before we begin, I saw this on twitter, do you think it would be good to use for this project: https://github.com/heydamir/unslop"

**Agent:** It's a Claude Code skill for making AI-built screens look more designed. It skimmed the files and found nothing unsafe, and suggested using it only as a polish pass after the spine features work. It warned that the skill may override the plan's colors and font.

**Decision (mine):** Skip it for now and leave it out of the plan.
