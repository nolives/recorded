"use client";

import { useEffect, useRef, useState } from "react";
import { AlbumCover } from "@/components/album-cover";
import {
  artistAlbumsUrl,
  artistSearchUrl,
  coverThumbnail,
  lookupUrl,
  searchUrl,
  toFoundAlbum,
  toFoundArtist,
  type FoundAlbum,
  type FoundArtist,
} from "@/lib/musicbrainz";

type Mode = "album" | "artist";
type Status = "idle" | "loading" | "done" | "busy" | "error";

const WAIT_MS = 400; // pause after typing before searching
const GAP_MS = 1100; // MusicBrainz allows about 1 request per second
const RETRY_MS = 1500; // first wait after a "busy" answer; grows each retry
const RETRIES = 3;
const TIMEOUT_MS = 10000;
const MAX_RESULTS = 8;

// Answers already fetched on this page, so the same search or artist
// doesn't ask MusicBrainz twice.
const pastAlbumSearches = new Map<string, FoundAlbum[]>();
const pastArtistSearches = new Map<string, FoundArtist[]>();
const pastArtistAlbums = new Map<string, FoundAlbum[]>();

// When the last request to MusicBrainz started, shared by every request on
// the page so they stay at least GAP_MS apart.
let lastRequestAt = 0;

class BusyError extends Error {}

// Fetches from MusicBrainz, waiting first if the last request was too
// recent. If it says it's busy (503), which also happens when MusicBrainz
// as a whole is overloaded, it waits a little longer each time and tries
// up to 3 more times.
async function politeFetch(url: string, signal: AbortSignal, attempt = 0): Promise<unknown> {
  const wait = lastRequestAt + GAP_MS - Date.now();
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  signal.throwIfAborted();
  lastRequestAt = Date.now();

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.any([signal, AbortSignal.timeout(TIMEOUT_MS)]),
  });
  if (response.status === 503) {
    if (attempt >= RETRIES) throw new BusyError();
    lastRequestAt = Date.now() + RETRY_MS * (attempt + 1) - GAP_MS;
    return politeFetch(url, signal, attempt + 1);
  }
  if (!response.ok) throw new Error(`MusicBrainz answered ${response.status}`);
  return response.json();
}

type RawGroup = Parameters<typeof toFoundAlbum>[0];

// Keeps one copy of each album (title + artist + year).
function withoutDuplicates(albums: FoundAlbum[]) {
  const seen = new Set<string>();
  return albums.filter((album) => {
    const key = `${album.title}|${album.artist}|${album.year}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// "Album" mode: albums matching the words typed.
async function findAlbums(term: string, signal: AbortSignal) {
  const body = (await politeFetch(searchUrl(term), signal)) as { "release-groups"?: RawGroup[] };
  const albums = (body["release-groups"] ?? [])
    .map(toFoundAlbum)
    .filter((album): album is FoundAlbum => album !== null);
  return withoutDuplicates(albums).slice(0, MAX_RESULTS);
}

// "Artist" mode, step 1: artists matching the name typed.
async function findArtists(term: string, signal: AbortSignal) {
  const body = (await politeFetch(artistSearchUrl(term), signal)) as {
    artists?: Parameters<typeof toFoundArtist>[0][];
  };
  return (body.artists ?? []).map(toFoundArtist).filter((artist): artist is FoundArtist => artist !== null);
}

// "Artist" mode, step 2: that artist's albums and EPs, newest first.
async function findArtistAlbums(artistMbid: string, signal: AbortSignal) {
  const body = (await politeFetch(artistAlbumsUrl(artistMbid), signal)) as { "release-groups"?: RawGroup[] };
  const newestFirst = [...(body["release-groups"] ?? [])].sort((a, b) =>
    (b["first-release-date"] ?? "").localeCompare(a["first-release-date"] ?? ""),
  );
  return withoutDuplicates(
    newestFirst.map(toFoundAlbum).filter((album): album is FoundAlbum => album !== null),
  );
}

export function AlbumSearch({
  inputClass,
  onPick,
  onGenre,
}: {
  inputClass: string;
  onPick: (album: FoundAlbum) => void;
  // Search results don't include genres, so the genre arrives a moment
  // after picking, from a second lookup.
  onGenre: (mbid: string, genre: string) => void;
}) {
  const [mode, setMode] = useState<Mode>("album");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [albums, setAlbums] = useState<FoundAlbum[]>([]);
  const [artists, setArtists] = useState<FoundArtist[]>([]);
  const [artist, setArtist] = useState<FoundArtist | null>(null); // the artist picked in step 1
  const [showEverything, setShowEverything] = useState(false); // include live albums and compilations
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const request = useRef<AbortController>(undefined);

  // Stop any search still running if the form goes away.
  useEffect(
    () => () => {
      clearTimeout(timer.current);
      request.current?.abort();
    },
    [],
  );

  // Runs one MusicBrainz request, ignoring answers to searches that a newer
  // one has replaced.
  async function run(work: (signal: AbortSignal) => Promise<void>) {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setStatus("loading");
    try {
      await work(controller.signal);
      setStatus("done");
    } catch (error) {
      if (controller.signal.aborted) return;
      setStatus(error instanceof BusyError ? "busy" : "error");
    }
  }

  function search(term: string, searchMode: Mode) {
    if (searchMode === "album") {
      const saved = pastAlbumSearches.get(term.toLowerCase());
      if (saved) {
        setAlbums(saved);
        setStatus("done");
        return;
      }
      run(async (signal) => {
        const found = await findAlbums(term, signal);
        pastAlbumSearches.set(term.toLowerCase(), found);
        setAlbums(found);
      });
    } else {
      const saved = pastArtistSearches.get(term.toLowerCase());
      if (saved) {
        setArtists(saved);
        setStatus("done");
        return;
      }
      run(async (signal) => {
        const found = await findArtists(term, signal);
        pastArtistSearches.set(term.toLowerCase(), found);
        setArtists(found);
      });
    }
  }

  // Clears results and searches again after a short pause.
  function startSearch(value: string, searchMode: Mode) {
    clearTimeout(timer.current);
    request.current?.abort();
    setAlbums([]);
    setArtists([]);
    setArtist(null);
    setShowEverything(false);

    const term = value.trim();
    if (term.length < 2) {
      setStatus("idle");
      return;
    }
    setStatus("loading");
    timer.current = setTimeout(() => search(term, searchMode), WAIT_MS);
  }

  function changeMode(next: Mode) {
    setMode(next);
    startSearch(query, next);
  }

  function chooseArtist(picked: FoundArtist) {
    setArtist(picked);
    setShowEverything(false);
    const saved = pastArtistAlbums.get(picked.mbid);
    if (saved) {
      setAlbums(saved);
      setStatus("done");
      return;
    }
    setAlbums([]);
    run(async (signal) => {
      const found = await findArtistAlbums(picked.mbid, signal);
      pastArtistAlbums.set(picked.mbid, found);
      setAlbums(found);
    });
  }

  async function lookUpGenre(mbid: string) {
    try {
      const group = await politeFetch(lookupUrl(mbid), new AbortController().signal);
      const genre = toFoundAlbum(group as RawGroup)?.genre;
      if (genre) onGenre(mbid, genre);
    } catch {
      // No genre is fine; it's optional and can be typed in.
    }
  }

  function pick(album: FoundAlbum) {
    setQuery("");
    startSearch("", mode);
    onPick(album);
    lookUpGenre(album.mbid);
  }

  // What's in the list right now.
  const choosingArtist = mode === "artist" && !artist;
  const studioOnly = albums.filter((album) => !album.kind);
  const otherCount = albums.length - studioOnly.length;
  const shownAlbums = mode === "artist" && !showEverything && studioOnly.length > 0 ? studioOnly : albums;

  const message = (() => {
    if (status === "loading") {
      if (mode === "album") return "Searching MusicBrainz…";
      return artist ? `Loading albums by ${artist.name}…` : "Searching for artists…";
    }
    if (status === "busy") return "MusicBrainz is busy. Wait a few seconds and try again, or type the album in below.";
    if (status === "error") return "Couldn't reach MusicBrainz. Try again in a moment, or type the album in below.";
    if (status !== "done") return "";
    if (choosingArtist) {
      return artists.length === 0 ? "No artists by that name. Check the spelling, or switch to Album." : "Pick the artist.";
    }
    if (albums.length === 0) {
      return artist
        ? `No albums found for ${artist.name}.`
        : "No matches. Try fewer words, switch to Artist, or type the album in below.";
    }
    // Searching an artist's name in Album mode mostly finds tribute albums,
    // so point people to Artist mode (the stranger test showed it's easy to miss).
    return mode === "album"
      ? "Pick one to fill in the album. Looking for one artist's albums? Switch to Artist."
      : "Pick one to fill in the album.";
  })();

  const rowClass =
    "flex w-full items-center gap-3 p-2 text-left transition-colors hover:bg-surface focus-visible:bg-surface focus-visible:outline-none";

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label htmlFor="album-search" className="text-sm font-medium">
          Find the album
          <span className="ml-1 font-normal text-muted">(optional)</span>
        </label>
        <fieldset className="flex rounded-md border border-line p-0.5 text-xs">
          <legend className="sr-only">Search by</legend>
          {(["album", "artist"] as const).map((value) => (
            <label
              key={value}
              className="cursor-pointer rounded px-2.5 py-1 text-muted transition-colors has-[:checked]:bg-accent has-[:checked]:font-medium has-[:checked]:text-background has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent"
            >
              <input
                type="radio"
                name="search-mode"
                value={value}
                checked={mode === value}
                onChange={() => changeMode(value)}
                className="sr-only"
              />
              {value === "album" ? "Album" : "Artist"}
            </label>
          ))}
        </fieldset>
      </div>

      <input
        id="album-search"
        type="search"
        autoComplete="off"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          startSearch(event.target.value, mode);
        }}
        onKeyDown={(event) => {
          // Enter picks the top result instead of submitting the form.
          if (event.key === "Enter") {
            event.preventDefault();
            if (choosingArtist && artists[0]) chooseArtist(artists[0]);
            else if (!choosingArtist && shownAlbums[0]) pick(shownAlbums[0]);
          }
          if (event.key === "Escape") {
            setQuery("");
            startSearch("", mode);
          }
        }}
        placeholder={mode === "album" ? "Album and artist" : "Artist name, like “the strokes”"}
        aria-describedby="album-search-status"
        className={inputClass}
      />
      <p id="album-search-status" aria-live="polite" className="min-h-5 text-sm text-muted">
        {message}
      </p>

      {artist ? (
        <div className="flex items-center justify-between gap-2 text-sm">
          <p className="min-w-0 truncate">
            Albums by <span className="font-medium">{artist.name}</span>
            <span className="text-muted"> · newest first</span>
          </p>
          <button
            type="button"
            onClick={() => {
              setArtist(null);
              setAlbums([]);
              setStatus("done");
            }}
            className="shrink-0 text-accent underline-offset-2 hover:underline"
          >
            ← Other artists
          </button>
        </div>
      ) : null}

      {choosingArtist && artists.length > 0 ? (
        <ul className="max-h-80 divide-y divide-line overflow-y-auto rounded-md border border-line">
          {artists.map((found) => (
            <li key={found.mbid}>
              <button type="button" onClick={() => chooseArtist(found)} className={rowClass}>
                <span className="min-w-0">
                  <span className="block truncate font-medium">{found.name}</span>
                  {found.detail ? <span className="block truncate text-sm text-muted">{found.detail}</span> : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {!choosingArtist && shownAlbums.length > 0 ? (
        <ul className="max-h-80 divide-y divide-line overflow-y-auto rounded-md border border-line">
          {shownAlbums.map((album) => (
            <li key={album.mbid}>
              <button type="button" onClick={() => pick(album)} className={rowClass}>
                <AlbumCover title={album.title} artist={album.artist} coverUrl={coverThumbnail(album.coverUrl)} cached={false} />
                <span className="min-w-0">
                  <span className="block truncate font-medium">{album.title}</span>
                  <span className="block truncate text-sm text-muted">
                    {album.artist}
                    {album.year ? ` · ${album.year}` : ""}
                    {album.kind ? ` · ${album.kind}` : ""}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {mode === "artist" && artist && otherCount > 0 && studioOnly.length > 0 ? (
        <button
          type="button"
          onClick={() => setShowEverything((shown) => !shown)}
          className="self-start text-sm text-accent underline-offset-2 hover:underline"
        >
          {showEverything ? "Hide live albums and compilations" : `Show live albums and compilations (${otherCount})`}
        </button>
      ) : null}

      <p className="text-xs text-muted">
        Album info from{" "}
        <a href="https://musicbrainz.org" target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">
          MusicBrainz
        </a>
        , covers from the{" "}
        <a href="https://coverartarchive.org" target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">
          Cover Art Archive
        </a>
        .
      </p>
    </div>
  );
}
