"use client";

import { useEffect, useRef, useState } from "react";
import { AlbumCover } from "@/components/album-cover";
import {
  coverThumbnail,
  lookupUrl,
  searchUrl,
  toFoundAlbum,
  type FoundAlbum,
} from "@/lib/musicbrainz";

type Status = "idle" | "loading" | "done" | "busy" | "error";

const WAIT_MS = 400; // pause after typing before searching
const GAP_MS = 1100; // MusicBrainz allows about 1 request per second
const RETRY_MS = 2000; // wait after a "busy" answer
const TIMEOUT_MS = 10000;
const MAX_RESULTS = 8;

// Searches already done on this page, so typing the same words again
// doesn't ask MusicBrainz twice.
const pastSearches = new Map<string, FoundAlbum[]>();

// When the last request to MusicBrainz started, shared by every request on
// the page so they stay at least GAP_MS apart.
let lastRequestAt = 0;

class BusyError extends Error {}

// Fetches from MusicBrainz, waiting first if the last request was too
// recent, and trying once more if it says it's busy (503).
async function politeFetch(url: string, signal: AbortSignal, retry = true): Promise<unknown> {
  const wait = lastRequestAt + GAP_MS - Date.now();
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  signal.throwIfAborted();
  lastRequestAt = Date.now();

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.any([signal, AbortSignal.timeout(TIMEOUT_MS)]),
  });
  if (response.status === 503) {
    if (!retry) throw new BusyError();
    // Busy: give it a couple of seconds, then try once more.
    lastRequestAt = Date.now() + RETRY_MS - GAP_MS;
    return politeFetch(url, signal, false);
  }
  if (!response.ok) throw new Error(`MusicBrainz answered ${response.status}`);
  return response.json();
}

// Keeps one copy of each album (title + artist + year), the first 8.
function tidy(albums: FoundAlbum[]) {
  const seen = new Set<string>();
  return albums
    .filter((album) => {
      const key = `${album.title}|${album.artist}|${album.year}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, MAX_RESULTS);
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
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [results, setResults] = useState<FoundAlbum[]>([]);
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

  async function search(term: string) {
    const key = term.toLowerCase();
    const saved = pastSearches.get(key);
    if (saved) {
      setResults(saved);
      setStatus("done");
      return;
    }

    const controller = new AbortController();
    request.current = controller;
    try {
      const body = (await politeFetch(searchUrl(term), controller.signal)) as {
        "release-groups"?: Parameters<typeof toFoundAlbum>[0][];
      };
      const albums = (body["release-groups"] ?? [])
        .map(toFoundAlbum)
        .filter((album): album is FoundAlbum => album !== null);
      const tidied = tidy(albums);
      pastSearches.set(key, tidied);
      setResults(tidied);
      setStatus("done");
    } catch (error) {
      // A newer search replaced this one; that one will update the list.
      if (controller.signal.aborted) return;
      setResults([]);
      setStatus(error instanceof BusyError ? "busy" : "error");
    }
  }

  function handleChange(value: string) {
    setQuery(value);
    clearTimeout(timer.current);
    request.current?.abort();

    const term = value.trim();
    if (term.length < 2) {
      setResults([]);
      setStatus("idle");
      return;
    }
    setStatus("loading");
    timer.current = setTimeout(() => search(term), WAIT_MS);
  }

  async function lookUpGenre(mbid: string) {
    try {
      const group = await politeFetch(lookupUrl(mbid), new AbortController().signal);
      const genre = toFoundAlbum(group as Parameters<typeof toFoundAlbum>[0])?.genre;
      if (genre) onGenre(mbid, genre);
    } catch {
      // No genre is fine; it's optional and can be typed in.
    }
  }

  function pick(album: FoundAlbum) {
    handleChange("");
    onPick(album);
    lookUpGenre(album.mbid);
  }

  const message = {
    idle: "",
    loading: "Searching MusicBrainz…",
    done:
      results.length === 0
        ? "No matches. Try fewer words, or type the album in below."
        : "Pick one to fill in the album.",
    busy: "MusicBrainz is busy. Wait a few seconds and search again, or type the album in below.",
    error: "Couldn't reach MusicBrainz. Try again in a moment, or type the album in below.",
  }[status];

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="album-search" className="text-sm font-medium">
        Find the album
        <span className="ml-1 font-normal text-muted">(optional)</span>
      </label>
      <input
        id="album-search"
        type="search"
        autoComplete="off"
        value={query}
        onChange={(event) => handleChange(event.target.value)}
        onKeyDown={(event) => {
          // Enter picks the top result instead of submitting the form.
          if (event.key === "Enter") {
            event.preventDefault();
            if (results[0]) pick(results[0]);
          }
          if (event.key === "Escape") handleChange("");
        }}
        placeholder="Album and artist"
        aria-describedby="album-search-status"
        className={inputClass}
      />
      <p id="album-search-status" aria-live="polite" className="min-h-5 text-sm text-muted">
        {message}
      </p>

      {results.length > 0 ? (
        <ul className="max-h-80 divide-y divide-line overflow-y-auto rounded-md border border-line">
          {results.map((album) => (
            <li key={album.mbid}>
              <button
                type="button"
                onClick={() => pick(album)}
                className="flex w-full items-center gap-3 p-2 text-left transition-colors hover:bg-surface focus-visible:bg-surface focus-visible:outline-none"
              >
                <AlbumCover title={album.title} artist={album.artist} coverUrl={coverThumbnail(album.coverUrl)} />
                <span className="min-w-0">
                  <span className="block truncate font-medium">{album.title}</span>
                  <span className="block truncate text-sm text-muted">
                    {album.artist}
                    {album.year ? ` · ${album.year}` : ""}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
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
