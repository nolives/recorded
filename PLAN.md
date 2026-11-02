# PLAN.md — Recorded

*Working title. A diary for the albums I listen to.*

## 1. Pitch

I'm building **Recorded** because I listen to a lot of full albums but forget what I thought of them a few weeks later, and no album-rating app has stuck for me the way Letterboxd has for movies. Recorded lets me log every listen with a score out of 10 and a short review, keep a list of all-time favorites, and see my listening habits over time.

**How often I'll use it:** a few times a week (about 2–5 albums a week) for the rest of the semester.

## 2. Features

Numbered in the order I'll build them. Each one is its own Issue, branch, and pull request.

**Spine features**

1. **Sign up and login.** As a new visitor, I want to create an account with my email and a password, then log in and log out, so that my album diary is private to me.
2. **Data model.** As a listener, I want my albums, listens, and favorites saved to my account in a database, so that they're still there every time I come back, and nobody else can see them.
3. **Log, view, edit, and delete listens.** As a listener, I want to log a listen (album title, artist, release year, genre, the date I listened, a score from 1–10, and an optional review), see all my listens in a diary list, open one listen's detail page, edit it, and delete it after an "Are you sure?" confirmation, so that my diary is always accurate.
4. **Validation.** As a listener, I want a friendly message next to the field if I leave the album title, artist, listen date, or score blank, or enter a score that isn't a whole number from 1 to 10, so that I never save a broken entry.
5. **Stars (all-time favorites).** As a listener, I want to star an album to mark it as an all-time favorite and see all my starred albums on a Favorites page, so that I have a short list of the albums I love most, separate from individual scores.
6. **Find things.** As a listener, I want to search my diary by album or artist, filter by genre, and sort by newest, oldest, highest score, or lowest score, so that I can quickly find a past listen.
7. **Dashboard.** As a listener, I want a dashboard showing my total listens, my average score, and my top genre, plus a bar chart of listens per month, so that I can see my listening habits.

**My 3 features**

8. **iTunes album autofill.** As a listener, I want to type an album name, pick the right result from a list with cover art, and have the title, artist, release year, genre, and cover filled in for me, so that logging a listen takes seconds instead of typing everything.
9. **Random re-listen button.** As a listener, I want a button that picks a random album I've scored 8 or higher, so that I rediscover albums I loved but haven't played in a while.
10. **Public profile link.** As a listener, I want to turn on a public, read-only page at `/u/<my-username>` that shows my album covers, scores, reviews, and favorites, so that I can share my taste with friends who don't have an account.

## 3. Database

Five tables in Supabase (Postgres). Albums are a **shared list**: "In Rainbows" is saved once, and every user's listens point to it. Everything personal (listens, scores, reviews, stars) belongs to one user and is private.

**`profiles` (the users table).** One row per account, created automatically when someone signs up.

| Column | Type | Notes |
|---|---|---|
| `id` | text (uuid) | **Primary key.** Same id as the Supabase login account |
| `username` | text | Required, unique. Used in the public profile link |
| `display_name` | text | Optional |
| `is_public` | true/false | Default false. Turns the public profile link on or off |
| `created_at` | date/time | Set automatically |

**`albums` (the main item, shared by all users)**

| Column | Type | Notes |
|---|---|---|
| `id` | number | **Primary key**, auto-generated |
| `title` | text | Required |
| `artist` | text | Required |
| `release_year` | number | Optional |
| `genre` | text | Optional |
| `cover_url` | text | Optional. Cover image link from iTunes |
| `itunes_id` | number | Optional, unique. Stops the same iTunes album from being saved twice |
| `added_by` | text (uuid) | Links to `profiles.id`. Who first added it. Only this user can edit the album's details |
| `created_at` | date/time | Set automatically |

**`listens` (one row each time I listen to an album)**

| Column | Type | Notes |
|---|---|---|
| `id` | number | **Primary key**, auto-generated |
| `user_id` | text (uuid) | Links to `profiles.id`. Required |
| `album_id` | number | Links to `albums.id`. Required |
| `listened_on` | date | Required. I pick the date, so I can back-log past listens |
| `score` | number | Required. Whole number from 1 to 10 |
| `review` | text | Optional |
| `created_at` | date/time | Set automatically |

**`stars` (junction table for all-time favorites)**

| Column | Type | Notes |
|---|---|---|
| `user_id` | text (uuid) | Links to `profiles.id`. Part of the primary key |
| `album_id` | number | Links to `albums.id`. Part of the primary key |
| `created_at` | date/time | Set automatically |

The primary key is the pair (`user_id`, `album_id`), so a user can star an album only once. One table holds everyone's stars.

**How the tables connect**

- One user has many listens (`profiles` → `listens`: one-to-many).
- One album has many listens (`albums` → `listens`: one-to-many). Together, `listens` connects users and albums many-to-many.
- Users and albums are also connected many-to-many through `stars`.

```mermaid
erDiagram
    profiles ||--o{ listens : "logs"
    albums   ||--o{ listens : "is listened to in"
    profiles ||--o{ stars   : "stars"
    albums   ||--o{ stars   : "is starred in"
    profiles ||--o{ albums  : "first added"

    profiles {
        uuid id PK
        text username
        text display_name
        boolean is_public
        timestamp created_at
    }
    albums {
        number id PK
        text title
        text artist
        number release_year
        text genre
        text cover_url
        number itunes_id
        uuid added_by FK
        timestamp created_at
    }
    listens {
        number id PK
        uuid user_id FK
        number album_id FK
        date listened_on
        number score
        text review
        timestamp created_at
    }
    stars {
        uuid user_id PK
        number album_id PK
        timestamp created_at
    }
```

**Privacy rules (Supabase Row Level Security).** Signed-in users can read albums, because album details aren't personal. Listens and stars can only be read, added, changed, or deleted by the user they belong to. The one exception: if a user turns on `is_public`, anyone can *read* (never change) that user's listens and stars on the public profile page.

## 4. Tests

1. **Data isolation.** *Given* User A has logged a listen of "In Rainbows" and User B has logged nothing, *when* User B signs in and loads their diary, *then* User B's list is empty, and asking the database directly for User A's listen by its id returns nothing.
2. **Dashboard stat (average score).** *Given* User A has listens scored 7, 8, and 10, and User B has one listen scored 2, *when* User A's dashboard stats are calculated, *then* User A's average score is 8.3 (25 ÷ 3, rounded to one decimal), and User B's listen doesn't change it.

Both tests run against a separate free Supabase **test** project, so they use the real privacy rules and never touch my real data.

## 5. Technologies

| What | Choice | Why |
|---|---|---|
| Coding agent | Claude Code | It can create branches, write code and tests, and open pull requests, which matches the feature loop. |
| Framework | Next.js (React + TypeScript) | Pages and server code live in one project, and it deploys to Vercel with no extra setup. |
| Database | Supabase (Postgres) | Real tables with relationships, plus Row Level Security so the database itself enforces "each user sees only their own data." |
| Sign up and login | Supabase Auth, email + password | New visitors sign up from inside the app. Email confirmation is turned off so the live demo sign-up works instantly. |
| Hosting | Vercel | Every merge into `main` redeploys automatically, so the live URL always stays current. |
| Album data | iTunes Search API | Free, needs no account or key, and returns cover art, genre, and release year. |
| Styling | Tailwind CSS | Fast to build a consistent dark theme without writing a separate stylesheet. |
| Chart | Recharts | A simple, popular React chart library for the listens-per-month bar chart. |
| Tests | Vitest | A fast test runner that works with TypeScript and can call Supabase directly. |

## 6. Design

- **Style:** dark and moody, so album covers are the most colorful thing on screen.
- **Colors:** near-black background (`#111214`), slightly lighter cards (`#1B1D21`), off-white text (`#F2F2F2`), gray secondary text (`#9A9CA3`), and one warm amber accent (`#F5A524`) for buttons, scores, and stars.
- **Layout:** album covers shown as a grid of square tiles. Each listen shows the cover, title, artist, date, and score badge. It works on a phone, since that's where I'll log most listens.
- **Type:** Inter, a clean sans-serif font.
- **Inspiration:** **Letterboxd** for the dark theme, the diary of entries, and the favorites row on a profile, and **Album of the Year** for showing scores prominently next to each album.

## 7. Risks and cuts

- **Least sure I can build:** the **public profile link**. It deliberately lets people without an account see some data, which goes against the main privacy rule. If the privacy rules are written wrong, it could leak private listens, and it must not break the data isolation test.
- **What I'll cut first:** the public profile link. If I run out of time, I'll replace it with a smaller third feature, such as a listening streak counter.
- **Other risks:**
  - The iTunes search could fail or return wrong matches. Manual entry always stays available as a fallback.
  - Free Supabase projects pause after a week without use. I'll use the app weekly and check that it's awake before the demo and grading.
