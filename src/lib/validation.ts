// Checks a listen before it's saved and returns a friendly message for
// each field that needs fixing. An empty object means everything is fine.

export type ListenInput = {
  title: string;
  artist: string;
  releaseYear: string;
  genre: string;
  listenedOn: string;
  score: string;
  review: string;
};

export type ListenField = keyof ListenInput;
export type ListenErrors = Partial<Record<ListenField, string>>;

export const REVIEW_MAX = 2000;
export const GENRE_MAX = 60;

// "Today" plus one day of leeway, so someone whose evening is already
// tomorrow on the server's clock (UTC) can still log tonight's listen.
function latestAllowedDate(now: Date) {
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  return tomorrow.toISOString().slice(0, 10);
}

function isRealDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function validateListen(input: ListenInput, now = new Date()): ListenErrors {
  const errors: ListenErrors = {};
  const maxYear = now.getUTCFullYear() + 1;

  if (!input.title) errors.title = "Enter the album title.";
  if (!input.artist) errors.artist = "Enter the artist.";

  if (input.releaseYear) {
    const year = Number(input.releaseYear);
    if (!Number.isInteger(year) || year < 1900 || year > maxYear) {
      errors.releaseYear = `Enter a year between 1900 and ${maxYear}, or leave it blank.`;
    }
  }

  if (input.genre.length > GENRE_MAX) {
    errors.genre = `Keep the genre under ${GENRE_MAX} characters.`;
  }

  if (!input.listenedOn) {
    errors.listenedOn = "Pick the date you listened.";
  } else if (!isRealDate(input.listenedOn)) {
    errors.listenedOn = "That isn't a real date.";
  } else if (input.listenedOn > latestAllowedDate(now)) {
    errors.listenedOn = "That date is in the future.";
  }

  if (input.score) {
    const score = Number(input.score);
    if (!Number.isInteger(score) || score < 1 || score > 10) {
      errors.score = "Pick a score from 1 to 10, or No score.";
    }
  }

  if (input.review.length > REVIEW_MAX) {
    errors.review = `Keep reviews under ${REVIEW_MAX.toLocaleString("en-US")} characters (yours is ${input.review.length.toLocaleString("en-US")}).`;
  }

  return errors;
}
