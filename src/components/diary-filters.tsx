"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useTransition } from "react";
import { DEFAULT_SORT, diaryHref, SORTS, type DiaryFilters, type Sort } from "@/lib/diary-filters";

const WAIT_MS = 350; // pause after typing before searching

const fieldClass =
  "h-10 w-full rounded-md border border-line bg-surface px-3 text-sm outline-none transition-colors focus:border-accent";

export function DiaryFiltersBar({ filters, genres }: { filters: DiaryFilters; genres: string[] }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [pending, startTransition] = useTransition();

  useEffect(() => () => clearTimeout(timer.current), []);

  // When the address changes some other way (Clear, or the Back button),
  // make the boxes match it. Skip the search box while someone is typing
  // in it, so their cursor isn't disturbed.
  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    const q = form.elements.namedItem("q");
    const genre = form.elements.namedItem("genre");
    const sort = form.elements.namedItem("sort");
    if (q instanceof HTMLInputElement && document.activeElement !== q) q.value = filters.q;
    if (genre instanceof HTMLSelectElement) genre.value = filters.genre;
    if (sort instanceof HTMLSelectElement) sort.value = filters.sort;
  }, [filters.q, filters.genre, filters.sort]);

  // Read the form and update the address, which reloads the list.
  // replace (not push) so each letter typed doesn't add a Back step.
  function apply() {
    clearTimeout(timer.current);
    const form = formRef.current;
    if (!form) return;
    const data = new FormData(form);
    const href = diaryHref({
      q: String(data.get("q") ?? "").trim(),
      genre: String(data.get("genre") ?? ""),
      sort: String(data.get("sort") ?? DEFAULT_SORT) as Sort,
    });
    startTransition(() => router.replace(href, { scroll: false }));
  }

  const filtered = Boolean(filters.q || filters.genre || filters.sort !== DEFAULT_SORT);

  return (
    // Without JavaScript this is a normal form that loads /diary?q=…
    <form
      ref={formRef}
      action="/diary"
      method="get"
      role="search"
      aria-label="Search and sort your diary"
      onSubmit={(event) => {
        event.preventDefault();
        apply();
      }}
      className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-[1fr_11rem_10rem_auto] sm:items-center"
    >
      <label className="col-span-2 sm:col-span-1">
        <span className="sr-only">Search by album or artist</span>
        <input
          type="search"
          name="q"
          defaultValue={filters.q}
          placeholder="Search album or artist"
          autoComplete="off"
          aria-label="Search by album or artist"
          maxLength={100}
          onChange={() => {
            clearTimeout(timer.current);
            timer.current = setTimeout(apply, WAIT_MS);
          }}
          className={fieldClass}
        />
      </label>

      <label>
        <span className="sr-only">Genre</span>
        <select name="genre" aria-label="Genre" defaultValue={filters.genre} onChange={apply} className={fieldClass}>
          <option value="">All genres</option>
          {genres.map((genre) => (
            <option key={genre} value={genre}>
              {genre}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span className="sr-only">Sort</span>
        <select name="sort" aria-label="Sort" defaultValue={filters.sort} onChange={apply} className={fieldClass}>
          {Object.entries(SORTS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <div className="col-span-2 flex items-center gap-3 text-sm sm:col-span-1 sm:h-10">
        {/* Only needed without JavaScript; with it, the list updates by itself. */}
        <noscript>
          <button type="submit" className="rounded-md border border-line px-3 py-1.5">
            Apply
          </button>
        </noscript>
        {filtered ? (
          <Link
            href="/diary"
            scroll={false}
            onClick={() => clearTimeout(timer.current)}
            className="text-muted underline-offset-2 hover:text-accent hover:underline"
          >
            Clear
          </Link>
        ) : null}
        <span aria-live="polite" className="text-muted">
          {pending ? "Updating…" : ""}
        </span>
      </div>
    </form>
  );
}
