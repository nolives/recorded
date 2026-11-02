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
