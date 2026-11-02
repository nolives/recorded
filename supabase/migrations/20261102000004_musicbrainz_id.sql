-- Album search moved from iTunes to MusicBrainz, whose album ids look like
-- "b835704b-05f4-4572-ae8f-d0bb9d8a8f95" (a uuid), so they get their own
-- column. Unique, so the same MusicBrainz album can't be saved twice.
-- itunes_id stays for albums saved before the switch.

alter table public.albums
  add column musicbrainz_id uuid unique;

comment on column public.albums.musicbrainz_id is
  'MusicBrainz release group id, set when the album is picked from search.';
comment on column public.albums.itunes_id is
  'iTunes album id. Only on albums saved before search moved to MusicBrainz.';
