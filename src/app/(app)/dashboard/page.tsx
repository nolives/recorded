import type { Metadata } from "next";
import Link from "next/link";
import { ColumnChart } from "@/components/column-chart";
import { diaryHref } from "@/lib/diary-filters";
import { loadDashboardStats } from "@/lib/dashboard-data";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Stats · Recorded" };

function StatTile({
  label,
  children,
  note,
  long = false,
}: {
  label: string;
  children: React.ReactNode;
  note: React.ReactNode;
  long?: boolean; // for words like "Children's Music": smaller, and may wrap to 2 lines
}) {
  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      <p className="text-sm text-muted">{label}</p>
      <p
        className={`mt-1 font-semibold ${
          long ? "line-clamp-2 text-2xl leading-tight break-words" : "truncate text-3xl"
        }`}
      >
        {children}
      </p>
      <p className="mt-1 text-sm text-muted">{note}</p>
    </div>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();

  // Shared with the dashboard test, so the test checks what this page shows.
  const { stats, failed: error } = await loadDashboardStats(supabase);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold">Your stats</h1>

      {error ? (
        <p role="alert" className="text-danger">
          We couldn&apos;t load your stats. Refresh to try again.
        </p>
      ) : stats.totalListens === 0 ? (
        <div className="rounded-lg border border-dashed border-line px-6 py-12 text-center">
          <p className="font-medium">No stats yet</p>
          <p className="mt-1 text-sm text-muted">
            <Link href="/listens/new" className="text-accent hover:underline">
              Log a listen
            </Link>{" "}
            and your stats will show up here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatTile label="Total listens" note="All time">
              {stats.totalListens.toLocaleString("en-US")}
            </StatTile>

            <StatTile
              label="Average score"
              note={
                stats.averageScore === null
                  ? "Score a listen to see this"
                  : `From ${stats.scoredListens} scored ${stats.scoredListens === 1 ? "listen" : "listens"}`
              }
            >
              {stats.averageScore === null ? (
                <span className="text-muted">—</span>
              ) : (
                <>
                  {stats.averageScore}
                  <span className="text-lg font-normal text-muted">/10</span>
                </>
              )}
            </StatTile>

            <StatTile
              label="Top genre"
              long
              note={
                stats.topGenre ? (
                  <Link href={diaryHref({ genre: stats.topGenre.name })} className="hover:text-accent hover:underline">
                    {stats.topGenre.count} {stats.topGenre.count === 1 ? "listen" : "listens"} · see them
                  </Link>
                ) : (
                  "Add genres to your listens to see this"
                )
              }
            >
              {stats.topGenre ? (
                <span title={stats.topGenre.name}>{stats.topGenre.name}</span>
              ) : (
                <span className="text-muted">—</span>
              )}
            </StatTile>
          </div>

          <ColumnChart
            id="per-month"
            title="Listens per month"
            subtitle="The last 12 months"
            nameHeader="Month"
            everyOtherLabelOnPhones
            columns={stats.months.map((month) => ({
              key: month.month,
              axisLabel: month.short,
              name: month.long,
              count: month.count,
            }))}
          />

          {stats.scoredListens > 0 ? (
            <ColumnChart
              id="scores"
              title="How you score"
              subtitle="How many listens got each score"
              nameHeader="Score"
              columns={stats.scores.map(({ score, count }) => ({
                key: String(score),
                axisLabel: String(score),
                name: `Scored ${score}/10`,
                count,
              }))}
              footnote={
                stats.unscoredListens > 0
                  ? `${stats.unscoredListens} ${stats.unscoredListens === 1 ? "listen has" : "listens have"} no score, so ${stats.unscoredListens === 1 ? "it isn't" : "they aren't"} shown (or counted in the average).`
                  : undefined
              }
            />
          ) : null}
        </div>
      )}
    </main>
  );
}
