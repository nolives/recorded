// Reading and applying the diary's search, genre filter and sort, which
// live in the page address, like /diary?q=strokes&genre=Rock&sort=score_high

export const SORTS = {
  newest: "Newest first",
  oldest: "Oldest first",
  score_high: "Highest score",
  score_low: "Lowest score",
} as const;

export type Sort = keyof typeof SORTS;

export type DiaryFilters = { q: string; genre: string; sort: Sort };

export const DEFAULT_SORT: Sort = "newest";

function firstValue(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

// Turns the address's ?q=…&genre=…&sort=… into clean filters. Anything
// unexpected (an unknown sort, a huge search) falls back to something safe.
export function readFilters(params: Record<string, string | string[] | undefined>): DiaryFilters {
  const q = firstValue(params.q).trim().replace(/\s+/g, " ").slice(0, 100);
  const genre = firstValue(params.genre).trim().slice(0, 60);
  const sort = firstValue(params.sort);
  return { q, genre, sort: sort in SORTS ? (sort as Sort) : DEFAULT_SORT };
}

// The address for a set of filters, leaving out empty ones and the default
// sort so it stays short: /diary?q=strokes
export function diaryHref(filters: Partial<DiaryFilters>) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.genre) params.set("genre", filters.genre);
  if (filters.sort && filters.sort !== DEFAULT_SORT) params.set("sort", filters.sort);
  const query = params.toString();
  return query ? `/diary?${query}` : "/diary";
}

// Builds the database filter "title or artist contains the search".
// The search is typed by the user, so two kinds of characters are made
// harmless first:
// - % and _ mean "anything" in a pattern, so they're escaped to match
//   themselves ("100%" finds "100%", not everything)
// - the filter is written as text, where commas, quotes and brackets have
//   meanings, so the whole pattern goes inside escaped double quotes
export function titleOrArtistFilter(search: string) {
  const pattern = `%${search.replace(/[\\%_]/g, "\\$&")}%`;
  const quoted = `"${pattern.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  return `title.ilike.${quoted},artist.ilike.${quoted}`;
}
