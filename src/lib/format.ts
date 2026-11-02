// Turns a database date like "2026-10-30" into "Oct 30, 2026".
// Treated as UTC so the day never shifts because of time zones.
export function formatListenDate(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

// Average of the scored listens, rounded to one decimal: [7, 8, 10] → "8.3".
// Unscored listens (null) are left out. Returns null if nothing is scored.
export function averageScore(scores: (number | null)[]) {
  const scored = scores.filter((score): score is number => score !== null);
  if (scored.length === 0) return null;
  const average = scored.reduce((sum, score) => sum + score, 0) / scored.length;
  return average.toFixed(1).replace(/\.0$/, "");
}
