-- Change from PLAN.md: a listen can be logged without a score.
-- Album, artist, and listen date stay required. When a score is given,
-- it must still be a whole number from 1 to 10 (the existing check allows empty).
alter table public.listens
  alter column score drop not null;

comment on column public.listens.score is
  'Optional 1-10 score. Unscored listens are left out of averages, score sorting, and the random re-listen pick.';
