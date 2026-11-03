// Chooses an album to re-listen to. A plain function (no database), with
// the random number passed in, so a test can check every rule.

export type RelistenListen = {
  album_id: number;
  listened_on: string; // "2026-10-30"
  score: number | null;
};

export type RelistenChoice = {
  albumId: number;
  bestScore: number;
  lastListened: string; // the most recent listen of this album, any score
  daysSince: number;
};

export const MIN_SCORE = 8;
export const RECENT_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

function daysBetween(isoDate: string, today: Date) {
  const [year, month, day] = isoDate.split("-").map(Number);
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Math.max(0, Math.round((todayUtc - Date.UTC(year, month - 1, day)) / DAY_MS));
}

// The rules:
// 1. Candidates are albums with at least one listen scored 8 or higher.
//    Unscored listens never make an album a candidate.
// 2. Skip the album shown last time ("Pick another"), unless it's the only one.
// 3. Prefer albums not logged in the last 30 days, the "haven't played
//    in a while" part. If every candidate is recent, use them all.
// 4. Pick one of those at random, each equally likely.
// Returns null if no album is scored 8 or higher.
export function chooseRelisten(
  listens: RelistenListen[],
  options: { today?: Date; skipAlbumId?: number; random?: () => number } = {},
): RelistenChoice | null {
  const { today = new Date(), skipAlbumId, random = Math.random } = options;

  // Each album's best score and most recent listen (of any score).
  const albums = new Map<number, { bestScore: number | null; lastListened: string }>();
  for (const { album_id, listened_on, score } of listens) {
    const album = albums.get(album_id) ?? { bestScore: null, lastListened: listened_on };
    if (score !== null && (album.bestScore === null || score > album.bestScore)) album.bestScore = score;
    if (listened_on > album.lastListened) album.lastListened = listened_on;
    albums.set(album_id, album);
  }

  let candidates: RelistenChoice[] = [...albums.entries()]
    .filter(([, album]) => album.bestScore !== null && album.bestScore >= MIN_SCORE)
    .map(([albumId, album]) => ({
      albumId,
      bestScore: album.bestScore as number,
      lastListened: album.lastListened,
      daysSince: daysBetween(album.lastListened, today),
    }))
    // A fixed order first, so the same random number always gives the same pick.
    .sort((a, b) => a.albumId - b.albumId);

  if (candidates.length === 0) return null;

  if (candidates.length > 1) {
    candidates = candidates.filter((choice) => choice.albumId !== skipAlbumId);
  }

  const notRecent = candidates.filter((choice) => choice.daysSince > RECENT_DAYS);
  const pool = notRecent.length > 0 ? notRecent : candidates;

  const index = Math.min(Math.floor(random() * pool.length), pool.length - 1);
  return pool[index];
}
