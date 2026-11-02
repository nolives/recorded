import { averageScore } from "@/lib/format";

// Works out the dashboard's numbers from a list of listens. It's a plain
// function (no database), so a test can hand it listens and check the
// answers.

export type StatsListen = {
  listened_on: string; // "2026-10-30"
  score: number | null;
  genre: string | null;
};

export type MonthCount = {
  month: string; // "2026-10"
  short: string; // "Oct"
  long: string; // "October 2026"
  count: number;
};

export type DashboardStats = {
  totalListens: number;
  scoredListens: number;
  averageScore: string | null; // "8.3", or null if nothing is scored
  topGenre: { name: string; count: number } | null;
  months: MonthCount[]; // oldest first, ending with the current month
};

const MONTHS_SHOWN = 12;

// "2026-10" → { short: "Oct", long: "October 2026" }
function monthNames(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1, 1));
  const format = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("en-US", { ...options, timeZone: "UTC" }).format(date);
  return { short: format({ month: "short" }), long: format({ month: "long", year: "numeric" }) };
}

// The last 12 months as "YYYY-MM", oldest first, ending with today's month.
function lastMonths(today: Date) {
  const months: string[] = [];
  for (let back = MONTHS_SHOWN - 1; back >= 0; back--) {
    const date = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - back, 1));
    months.push(date.toISOString().slice(0, 7));
  }
  return months;
}

export function dashboardStats(listens: StatsListen[], today = new Date()): DashboardStats {
  // Average: only scored listens count (unscored ones are left out, as
  // decided in feature 2).
  const scores = listens.map((listen) => listen.score);

  // Top genre: the genre with the most listens. A tie goes to the one that
  // comes first alphabetically, so the answer never changes at random.
  const genreCounts = new Map<string, number>();
  for (const { genre } of listens) {
    if (genre) genreCounts.set(genre, (genreCounts.get(genre) ?? 0) + 1);
  }
  const [topGenre] = [...genreCounts.entries()].sort(
    ([nameA, countA], [nameB, countB]) => countB - countA || nameA.localeCompare(nameB),
  );

  // Listens per month for the chart, including months with none.
  const perMonth = new Map(lastMonths(today).map((month) => [month, 0]));
  for (const { listened_on } of listens) {
    const month = listened_on.slice(0, 7);
    if (perMonth.has(month)) perMonth.set(month, (perMonth.get(month) ?? 0) + 1);
  }

  return {
    totalListens: listens.length,
    scoredListens: scores.filter((score) => score !== null).length,
    averageScore: averageScore(scores),
    topGenre: topGenre ? { name: topGenre[0], count: topGenre[1] } : null,
    months: [...perMonth.entries()].map(([month, count]) => ({ month, ...monthNames(month), count })),
  };
}
