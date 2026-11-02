"use client";

import { useEffect, useRef, useState } from "react";
import { AlbumCover } from "@/components/album-cover";
import { itunesSearchUrl, itunesThumbnail, toItunesAlbum, type ItunesAlbum } from "@/lib/itunes";

type Status = "idle" | "loading" | "done" | "error";

const WAIT_MS = 350; // pause after typing before searching
const TIMEOUT_MS = 8000;

const MAX_RESULTS = 8;

// Searches already done on this page, so typing the same words again
// doesn't ask Apple twice (it allows about 20 searches a minute).
const pastSearches = new Map<string, ItunesAlbum[]>();

// Tidies iTunes results for the list:
// - hides singles, which iTunes counts as albums and which crowd out albums
// - keeps one copy when the same album is listed twice (explicit and clean)
function tidy(albums: ItunesAlbum[]) {
  const seen = new Set<string>();
  return albums
    .filter((album) => {
      if (/ - Single$/.test(album.title)) return false;
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
}: {
  inputClass: string;
  onPick: (album: ItunesAlbum) => void;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [results, setResults] = useState<ItunesAlbum[]>([]);
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
      const response = await fetch(itunesSearchUrl(term), {
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(TIMEOUT_MS)]),
      });
      if (!response.ok) throw new Error(`iTunes answered ${response.status}`);
      const body = (await response.json()) as { results?: Parameters<typeof toItunesAlbum>[0][] };
      const albums = (body.results ?? [])
        .map(toItunesAlbum)
        .filter((album): album is ItunesAlbum => album !== null);
      const tidied = tidy(albums);
      pastSearches.set(key, tidied);
      setResults(tidied);
      setStatus("done");
    } catch {
      // A newer search replaced this one; that one will update the list.
      if (controller.signal.aborted) return;
      setResults([]);
      setStatus("error");
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

  function pick(album: ItunesAlbum) {
    handleChange("");
    onPick(album);
  }

  const message = {
    idle: "",
    loading: "Searching iTunes…",
    done:
      results.length === 0
        ? "No matches on iTunes. You can type the album in below."
        : "Pick one to fill in the album.",
    error: "Couldn't reach iTunes. It may be busy, so try again in a minute, or type the album in below.",
  }[status];

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="album-search" className="text-sm font-medium">
        Find it on iTunes
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
        placeholder="Album or artist"
        aria-describedby="album-search-status"
        className={inputClass}
      />
      <p id="album-search-status" aria-live="polite" className="min-h-5 text-sm text-muted">
        {message}
      </p>

      {results.length > 0 ? (
        <ul className="max-h-80 divide-y divide-line overflow-y-auto rounded-md border border-line">
          {results.map((album) => (
            <li key={album.itunesId}>
              <button
                type="button"
                onClick={() => pick(album)}
                className="flex w-full items-center gap-3 p-2 text-left transition-colors hover:bg-surface focus-visible:bg-surface focus-visible:outline-none"
              >
                <AlbumCover title={album.title} artist={album.artist} coverUrl={itunesThumbnail(album.coverUrl)} />
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
    </div>
  );
}
