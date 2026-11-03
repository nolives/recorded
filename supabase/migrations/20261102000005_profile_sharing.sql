-- Feature 10: a shareable profile page with three sharing settings.
--   private (default): only you
--   link:   anyone with your secret link (/u/<username>?key=<share_token>)
--   public: anyone at /u/<username>
-- This replaces the on/off is_public column planned in feature 1.

alter table public.profiles
  add column sharing text not null default 'private'
    check (sharing in ('private', 'link', 'public')),
  -- The secret part of a "Link only" link. A random uuid can't be guessed;
  -- making a new one ("reset link") stops old links from working.
  add column share_token uuid;

update public.profiles set sharing = 'public' where is_public;
alter table public.profiles drop column is_public;

-- Signed-in users could update every column of their own profile row.
-- Narrow that to the columns the app actually changes, so nobody can
-- rename themselves (or anything else) by calling the database directly.
revoke update on public.profiles from authenticated;
grant update (display_name, sharing, share_token) on public.profiles to authenticated;


-- ---------------------------------------------------------------------
-- Reading a shared profile.
--
-- The privacy rules on profiles, listens and stars still only ever show
-- people their OWN rows, and logged-out visitors can't read any table.
-- Shared profiles are read only through the functions below. Each one
-- first asks visible_profile_id whether the viewer may see that profile,
-- and returns nothing at all if not, so a private profile looks exactly
-- like one that doesn't exist.
-- ---------------------------------------------------------------------

-- The profile's id if the current viewer may see it, otherwise null:
-- it's public, or it's link-only and the right key was given, or the
-- viewer is the owner. Only used inside the functions below.
create function public.visible_profile_id(p_username text, p_key uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id
  from public.profiles
  where username = lower(p_username)
    and (
      sharing = 'public'
      or (sharing = 'link' and share_token is not null and share_token = p_key)
      or id = (select auth.uid())
    );
$$;

revoke all on function public.visible_profile_id(text, uuid) from public, anon, authenticated;

-- The profile itself (never the share_token).
create function public.shared_profile(p_username text, p_key uuid default null)
returns table (
  username text,
  display_name text,
  sharing text,
  is_owner boolean,
  joined_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.username, p.display_name, p.sharing, p.id = (select auth.uid()), p.created_at
  from public.profiles p
  where p.id = public.visible_profile_id(p_username, p_key);
$$;

-- Every listen on a shared profile, newest first, with its album.
create function public.shared_listens(p_username text, p_key uuid default null)
returns table (
  id bigint,
  listened_on date,
  score smallint,
  review text,
  album_id bigint,
  title text,
  artist text,
  release_year integer,
  genre text,
  cover_url text
)
language sql
stable
security definer
set search_path = ''
as $$
  with visible as (select public.visible_profile_id(p_username, p_key) as user_id)
  select l.id, l.listened_on, l.score, l.review,
         a.id, a.title, a.artist, a.release_year, a.genre, a.cover_url
  from visible v
  join public.listens l on l.user_id = v.user_id
  join public.albums a on a.id = l.album_id
  order by l.listened_on desc, l.created_at desc;
$$;

-- The favorites shelf on a shared profile, newest star first.
create function public.shared_favorites(p_username text, p_key uuid default null)
returns table (
  album_id bigint,
  title text,
  artist text,
  release_year integer,
  cover_url text,
  starred_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  with visible as (select public.visible_profile_id(p_username, p_key) as user_id)
  select a.id, a.title, a.artist, a.release_year, a.cover_url, s.created_at
  from visible v
  join public.stars s on s.user_id = v.user_id
  join public.albums a on a.id = s.album_id
  order by s.created_at desc;
$$;

revoke all on function public.shared_profile(text, uuid) from public;
revoke all on function public.shared_listens(text, uuid) from public;
revoke all on function public.shared_favorites(text, uuid) from public;
grant execute on function public.shared_profile(text, uuid) to anon, authenticated;
grant execute on function public.shared_listens(text, uuid) to anon, authenticated;
grant execute on function public.shared_favorites(text, uuid) to anon, authenticated;
