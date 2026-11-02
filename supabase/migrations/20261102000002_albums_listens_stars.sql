-- Feature 2: the data model.
-- albums  = one shared list of albums (main item)
-- listens = one row each time a user listens to an album (private)
-- stars   = junction table: "this user starred this album" (private)

-- ---------------------------------------------------------------------------
-- albums: shared by all users. "In Rainbows" is saved once.
-- ---------------------------------------------------------------------------
create table public.albums (
  id bigint generated always as identity primary key,
  title text not null check (length(trim(title)) > 0),
  artist text not null check (length(trim(artist)) > 0),
  release_year integer check (release_year between 1900 and 2100),
  genre text,
  cover_url text,
  itunes_id bigint unique,
  added_by uuid references public.profiles (id) on delete set null
    default auth.uid(),
  created_at timestamptz not null default now()
);

alter table public.albums enable row level security;

grant select, insert, update on public.albums to authenticated;

-- Album details aren't personal, so any signed-in user can read them.
create policy "Signed-in users can read albums"
  on public.albums for select
  to authenticated
  using (true);

-- You can add an album, and it's recorded as added by you.
create policy "Signed-in users can add albums"
  on public.albums for insert
  to authenticated
  with check (added_by = (select auth.uid()));

-- Only the person who first added an album can edit its details.
create policy "Users can edit albums they added"
  on public.albums for update
  to authenticated
  using (added_by = (select auth.uid()))
  with check (added_by = (select auth.uid()));

-- No delete policy: albums are shared, so nobody can delete one that
-- other people's listens might point to.

-- ---------------------------------------------------------------------------
-- listens: each time a user listens to an album. Private to that user.
-- ---------------------------------------------------------------------------
create table public.listens (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid()
    references public.profiles (id) on delete cascade,
  album_id bigint not null
    references public.albums (id) on delete restrict,
  listened_on date not null,
  score smallint not null check (score between 1 and 10),
  review text check (review is null or length(review) <= 2000),
  created_at timestamptz not null default now()
);

create index listens_user_date_idx on public.listens (user_id, listened_on desc);
create index listens_album_idx on public.listens (album_id);

alter table public.listens enable row level security;

grant select, insert, update, delete on public.listens to authenticated;

create policy "Users can read their own listens"
  on public.listens for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can add their own listens"
  on public.listens for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "Users can edit their own listens"
  on public.listens for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Users can delete their own listens"
  on public.listens for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- stars: junction table between users and albums ("all-time favorites").
-- One table for everyone; the pair (user, album) can only appear once.
-- ---------------------------------------------------------------------------
create table public.stars (
  user_id uuid not null default auth.uid()
    references public.profiles (id) on delete cascade,
  album_id bigint not null
    references public.albums (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, album_id)
);

create index stars_album_idx on public.stars (album_id);

alter table public.stars enable row level security;

grant select, insert, delete on public.stars to authenticated;

create policy "Users can read their own stars"
  on public.stars for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can star albums for themselves"
  on public.stars for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "Users can unstar their own stars"
  on public.stars for delete
  to authenticated
  using (user_id = (select auth.uid()));
