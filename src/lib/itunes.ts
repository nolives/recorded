// Album lookups on Apple's free iTunes Search API (no key needed).
// Docs: https://performance-partners.apple.com/search-api

export type ItunesAlbum = {
  itunesId: number;
  title: string;
  artist: string;
  year: string;
  genre: string;
  coverUrl: string;
};

// The parts of an iTunes result we use.
type ItunesResult = {
  wrapperType?: string;
  collectionId?: number;
  collectionName?: string;
  artistName?: string;
  releaseDate?: string;
  primaryGenreName?: string;
  artworkUrl100?: string;
};

// Turns a raw iTunes result into an album, or null if it isn't one.
export function toItunesAlbum(result: ItunesResult): ItunesAlbum | null {
  if (result.wrapperType !== "collection" || !result.collectionId) return null;
  if (!result.collectionName || !result.artistName) return null;
  return {
    itunesId: result.collectionId,
    title: result.collectionName,
    artist: result.artistName,
    year: result.releaseDate?.slice(0, 4) ?? "",
    genre: result.primaryGenreName ?? "",
    // iTunes links a 100px cover; the same address serves a sharper 600px one.
    coverUrl: (result.artworkUrl100 ?? "").replace("/100x100bb.", "/600x600bb."),
  };
}

// The small (100px) version of a saved cover, for little previews.
export function itunesThumbnail(coverUrl: string) {
  return coverUrl.replace("/600x600bb.", "/100x100bb.");
}

// Address for a search. The browser calls this directly (Apple allows it),
// so each person's searches count against their own limit, not the server's.
export function itunesSearchUrl(term: string) {
  const params = new URLSearchParams({
    term,
    media: "music",
    entity: "album",
    country: "US",
    // Ask for extra, since singles (which iTunes counts as albums) get hidden.
    limit: "25",
  });
  return `https://itunes.apple.com/search?${params}`;
}

// Used by the server when saving a newly picked album: asks Apple for the
// album with this id. Returns the album, null if the id isn't a real album,
// or "unavailable" if Apple didn't answer (it's down, or limiting requests).
export async function lookupItunesAlbum(
  rawId: string,
): Promise<ItunesAlbum | null | "unavailable"> {
  if (!/^\d{1,12}$/.test(rawId)) return null;
  try {
    const response = await fetch(
      `https://itunes.apple.com/lookup?id=${rawId}&entity=album&country=US`,
      { cache: "no-store", signal: AbortSignal.timeout(5000) },
    );
    if (!response.ok) return "unavailable";
    const body = (await response.json()) as { results?: ItunesResult[] };
    for (const result of body.results ?? []) {
      const album = toItunesAlbum(result);
      if (album && String(album.itunesId) === rawId) return album;
    }
    return null;
  } catch {
    return "unavailable";
  }
}
