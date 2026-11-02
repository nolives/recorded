// Album lookups on MusicBrainz, a free music database kept up by fans
// (no key needed), with covers from the Cover Art Archive.
// Docs: https://musicbrainz.org/doc/MusicBrainz_API

export type FoundAlbum = {
  mbid: string; // MusicBrainz's id for the album ("release group")
  title: string;
  artist: string;
  year: string;
  genre: string;
  coverUrl: string;
};

// The parts of a MusicBrainz release group we use.
type ReleaseGroup = {
  id?: string;
  title?: string;
  "primary-type"?: string | null;
  "first-release-date"?: string;
  "artist-credit"?: { name: string; joinphrase?: string }[];
  genres?: { name: string; count: number }[];
};

const API = "https://musicbrainz.org/ws/2";
const MBID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function isMbid(value: string) {
  return MBID.test(value);
}

// The 500px cover. Cover Art Archive sends the browser on to the image.
export function coverUrlFor(mbid: string) {
  return `https://coverartarchive.org/release-group/${mbid}/front-500`;
}

// A smaller version of a saved cover, for little previews. Also handles
// covers saved from iTunes before the switch.
export function coverThumbnail(coverUrl: string) {
  return coverUrl
    .replace("/front-500", "/front-250") // Cover Art Archive
    .replace("_thumb500.jpg", "_thumb250.jpg") // Internet Archive
    .replace("/600x600bb.", "/100x100bb."); // iTunes
}

// "alternative rock" → "Alternative Rock"
function titleCase(text: string) {
  return text.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

// Turns a MusicBrainz result into an album, or null if it's a single or
// isn't usable.
export function toFoundAlbum(group: ReleaseGroup): FoundAlbum | null {
  if (!group.id || !group.title || !group["artist-credit"]?.length) return null;
  if (group["primary-type"] === "Single") return null;

  // Credits like "Simon & Garfunkel" come in pieces joined by " & ".
  const artist = group["artist-credit"]
    .map((credit) => credit.name + (credit.joinphrase ?? ""))
    .join("");
  // The genre the most fans picked, if any.
  const [topGenre] = [...(group.genres ?? [])].sort((a, b) => b.count - a.count);

  return {
    mbid: group.id,
    title: group.title,
    artist,
    year: group["first-release-date"]?.slice(0, 4) ?? "",
    genre: topGenre ? titleCase(topGenre.name) : "",
    coverUrl: coverUrlFor(group.id),
  };
}

// Address for a search. Characters MusicBrainz treats as search commands
// (like quotes or colons) become spaces so any typing works.
export function searchUrl(term: string) {
  const query = term.replace(/[+\-&|!(){}[\]^"~*?:\\/]/g, " ").trim();
  const params = new URLSearchParams({ query, fmt: "json", limit: "25" });
  return `${API}/release-group/?${params}`;
}

// Address for one album, with its genres.
export function lookupUrl(mbid: string) {
  return `${API}/release-group/${mbid}?inc=artist-credits+genres&fmt=json`;
}

// MusicBrainz asks apps to say who they are when calling from a server.
const SERVER_HEADERS = {
  "User-Agent": "Recorded/1.0 (https://recorded-albums.vercel.app)",
  Accept: "application/json",
};

// Used by the server when saving a newly picked album: asks MusicBrainz
// for the album with this id, so a title or id changed by hand in the page
// can't end up in the shared album list. Returns the album, null if the id
// isn't a real album, or "unavailable" if MusicBrainz didn't answer.
export async function lookupAlbum(mbid: string): Promise<FoundAlbum | null | "unavailable"> {
  if (!isMbid(mbid)) return null;
  try {
    const ask = () =>
      fetch(lookupUrl(mbid), {
        headers: SERVER_HEADERS,
        cache: "no-store",
        signal: AbortSignal.timeout(6000),
      });
    let response = await ask();
    // 503 means "too many requests right now": wait a moment, try once more.
    if (response.status === 503) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      response = await ask();
    }
    if (response.status === 404 || response.status === 400) return null;
    if (!response.ok) {
      console.warn(`MusicBrainz lookup for ${mbid} answered ${response.status}`);
      return "unavailable";
    }
    const album = toFoundAlbum((await response.json()) as ReleaseGroup);
    if (!album || album.mbid !== mbid) return null;

    album.coverUrl = await resolveCover(mbid);
    return album;
  } catch {
    return "unavailable";
  }
}

// Finds where the album's cover lives. Cover Art Archive answers with a
// permanent Internet Archive address, and saving that address skips the
// slowest step every time the cover is shown. Returns "" if there's no
// cover. If Cover Art Archive doesn't answer, keeps its address; the page
// shows initials if the image fails.
async function resolveCover(mbid: string) {
  const fallback = coverUrlFor(mbid);
  try {
    const response = await fetch(fallback, {
      method: "HEAD",
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    if (response.status === 404) return "";
    const location = response.headers.get("location") ?? "";
    return location.startsWith("https://archive.org/") ? location : fallback;
  } catch {
    return fallback;
  }
}
