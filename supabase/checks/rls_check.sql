-- Privacy-rule check for feature 2. Everything is rolled back at the end.
-- Run: npx supabase db query --remote --yes -f supabase/checks/rls_check.sql
begin;

-- Two pretend users (rolled back). The sign-up trigger gives each a profiles row.
insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-0000-0000-00000000000a', 'authenticated', 'authenticated', 'rls-check-a@recorded-app.test', '{"username":"rls_check_a"}', now(), now()),
  ('00000000-0000-0000-0000-00000000000b', 'authenticated', 'authenticated', 'rls-check-b@recorded-app.test', '{"username":"rls_check_b"}', now(), now());

create temp table results (step int, check_name text, expected text, actual text);
grant all on results to authenticated;

-- ===== Act as User A =====
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
set local role authenticated;

insert into albums (title, artist, release_year, genre) values ('RLS Check Album', 'RLS Check Artist', 2007, 'Alternative');
insert into listens (album_id, listened_on, score, review)
  select id, date '2026-10-30', 9, 'check' from albums where title = 'RLS Check Album';
insert into stars (album_id) select id from albums where title = 'RLS Check Album';

insert into results select 1, 'A sees own listen', '1', count(*)::text from listens where user_id = auth.uid();
insert into results select 2, 'A sees own stars', '1', count(*)::text from stars;
insert into results select 3, 'Album recorded as added by A', 'true', (added_by = auth.uid())::text from albums where title = 'RLS Check Album';

-- Validation rules (each should be blocked)
do $$ begin
  insert into listens (album_id, listened_on, score) select id, current_date, 11 from albums where title = 'RLS Check Album';
  insert into results values (4, 'Score 11 rejected', 'blocked', 'ALLOWED');
exception when others then insert into results values (4, 'Score 11 rejected', 'blocked', 'blocked');
end $$;
do $$ begin
  insert into listens (album_id, listened_on, score) select id, current_date, 0 from albums where title = 'RLS Check Album';
  insert into results values (5, 'Score 0 rejected', 'blocked', 'ALLOWED');
exception when others then insert into results values (5, 'Score 0 rejected', 'blocked', 'blocked');
end $$;
do $$ begin
  insert into listens (album_id, score) select id, 7 from albums where title = 'RLS Check Album';
  insert into results values (6, 'Missing listen date rejected', 'blocked', 'ALLOWED');
exception when others then insert into results values (6, 'Missing listen date rejected', 'blocked', 'blocked');
end $$;
do $$ begin
  insert into listens (album_id, listened_on) select id, date '2026-10-31' from albums where title = 'RLS Check Album';
  insert into results values (20, 'Listen with no score accepted', 'allowed', 'allowed');
exception when others then insert into results values (20, 'Listen with no score accepted', 'allowed', 'blocked: ' || sqlerrm);
end $$;
do $$ begin
  insert into albums (title, artist) values ('   ', 'Someone');
  insert into results values (7, 'Blank album title rejected', 'blocked', 'ALLOWED');
exception when others then insert into results values (7, 'Blank album title rejected', 'blocked', 'blocked');
end $$;
do $$ begin
  insert into stars (album_id) select id from albums where title = 'RLS Check Album';
  insert into results values (8, 'Starring same album twice rejected', 'blocked', 'ALLOWED');
exception when others then insert into results values (8, 'Starring same album twice rejected', 'blocked', 'blocked');
end $$;

-- ===== Act as User B =====
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);

insert into results select 9,  'B sees any listens', '0', count(*)::text from listens;
insert into results select 10, 'B sees any stars', '0', count(*)::text from stars;
insert into results select 11, 'B can read the shared album', '1', count(*)::text from albums where title = 'RLS Check Album';
insert into results select 12, 'B sees A''s profile', '0', count(*)::text from profiles where username = 'rls_check_a';

with u as (update listens set score = 1 returning 1)
  insert into results select 13, 'B changes A''s listen', '0 rows', count(*) || ' rows' from u;
with d as (delete from listens returning 1)
  insert into results select 14, 'B deletes A''s listen', '0 rows', count(*) || ' rows' from d;
with d as (delete from stars returning 1)
  insert into results select 15, 'B deletes A''s star', '0 rows', count(*) || ' rows' from d;
with u as (update albums set title = 'Changed by B' where title = 'RLS Check Album' returning 1)
  insert into results select 16, 'B edits album A added', '0 rows', count(*) || ' rows' from u;

do $$ begin
  insert into listens (user_id, album_id, listened_on, score)
    select '00000000-0000-0000-0000-00000000000a', id, current_date, 5 from albums where title = 'RLS Check Album';
  insert into results values (17, 'B adds a listen to A''s diary', 'blocked', 'ALLOWED');
exception when others then insert into results values (17, 'B adds a listen to A''s diary', 'blocked', 'blocked');
end $$;
do $$ begin
  delete from albums where title = 'RLS Check Album';
  insert into results select 18, 'Anyone deletes a shared album', '0 rows', (select count(*) from albums where title = 'RLS Check Album')::text || ' left (want 1)';
exception when others then insert into results values (18, 'Anyone deletes a shared album', '0 rows', 'blocked');
end $$;

-- ===== Back to User A: their data is untouched =====
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
insert into results select 19, 'A''s scored listen still has score 9', '9', score::text from listens where score is not null;
insert into results select 21, 'A still sees both listens', '2', count(*)::text from listens;

reset role;
select step, check_name, expected, actual,
       case when actual = expected or (step = 18 and (actual = 'blocked' or actual like '1 left%')) then 'PASS' else 'FAIL' end as result
  from results order by step;

rollback;
