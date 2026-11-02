import type { MonthCount } from "@/lib/stats";

// Picks tidy axis numbers: steps of 1, 2, 5, 10, 20, 50… with about 4 steps.
function axisTicks(max: number) {
  if (max <= 4) {
    const top = Math.max(max, 1);
    return Array.from({ length: top + 1 }, (_, i) => i);
  }
  const rough = max / 4;
  const power = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 5, 10].map((n) => n * power).find((n) => n >= rough) ?? 10 * power;
  const top = Math.ceil(max / step) * step;
  return Array.from({ length: top / step + 1 }, (_, i) => i * step);
}

const plural = (count: number) => `${count} ${count === 1 ? "listen" : "listens"}`;

// Column chart of listens per month. One series, so no legend: the title
// says what's plotted. Hover or tab to a column to see its month and count;
// the same numbers are in the table underneath.
export function ListensChart({ months }: { months: MonthCount[] }) {
  const max = Math.max(...months.map((month) => month.count));
  const ticks = axisTicks(max);
  const top = ticks[ticks.length - 1];
  // Label only the busiest month (the most recent one, if tied), so the
  // chart isn't covered in numbers.
  const busiest = max > 0 ? months.findLastIndex((month) => month.count === max) : -1;

  return (
    <section aria-labelledby="chart-title" className="rounded-lg border border-line bg-surface p-4 sm:p-5">
      <h2 id="chart-title" className="font-semibold">
        Listens per month
      </h2>
      <p className="text-sm text-muted">The last 12 months</p>

      <div className="mt-6 flex gap-2">
        {/* Axis numbers */}
        <div aria-hidden="true" className="relative h-48 w-6 shrink-0 text-right text-xs tabular-nums text-muted">
          {ticks.map((tick) => (
            <span
              key={tick}
              className="absolute right-0 -translate-y-1/2"
              style={{ bottom: `${(tick / top) * 100}%` }}
            >
              {tick}
            </span>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          <div className="relative h-48">
            {/* Gridlines: hairline, recessive */}
            {ticks.map((tick) => (
              <div
                key={tick}
                aria-hidden="true"
                className={`absolute inset-x-0 border-t ${tick === 0 ? "border-muted/50" : "border-line"}`}
                style={{ bottom: `${(tick / top) * 100}%` }}
              />
            ))}

            {/* Columns. Each whole slot is the hover/focus target, not just
                the painted bar, so short bars are easy to hit. */}
            <ol className="absolute inset-0 flex">
              {months.map((month, index) => {
                const height = (month.count / top) * 100;
                return (
                  <li
                    key={month.month}
                    tabIndex={0}
                    aria-label={`${month.long}: ${plural(month.count)}`}
                    className="group relative flex h-full flex-1 items-end justify-center px-px outline-none"
                  >
                    <div
                      className="w-full max-w-6 rounded-t-[4px] bg-chart transition-[filter] group-hover:brightness-125 group-focus-visible:brightness-125"
                      style={{ height: `${height}%` }}
                    />
                    {index === busiest ? (
                      <span
                        aria-hidden="true"
                        className="absolute text-xs font-medium tabular-nums group-hover:opacity-0 group-focus-visible:opacity-0"
                        style={{ bottom: `calc(${height}% + 4px)` }}
                      >
                        {month.count}
                      </span>
                    ) : null}
                    {/* Tooltip: the value leads, the month follows */}
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none absolute z-10 hidden whitespace-nowrap rounded-md border border-line bg-background px-2 py-1 text-xs shadow-lg group-hover:block group-focus-visible:block ${
                        index < 3 ? "left-0" : index > months.length - 4 ? "right-0" : "left-1/2 -translate-x-1/2"
                      }`}
                      style={{ bottom: `calc(${height}% + 8px)` }}
                    >
                      <span className="block font-semibold">{plural(month.count)}</span>
                      <span className="block text-muted">{month.long}</span>
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>

          {/* Month names; every other one on narrow screens so they don't collide */}
          <ol aria-hidden="true" className="mt-2 flex text-center text-xs text-muted">
            {months.map((month, index) => (
              <li
                key={month.month}
                className={`flex-1 ${index % 2 === (months.length - 1) % 2 ? "" : "invisible sm:visible"}`}
              >
                {month.short}
              </li>
            ))}
          </ol>
        </div>
      </div>

      <details className="mt-4 text-sm">
        <summary className="cursor-pointer text-muted hover:text-foreground">Show as a table</summary>
        <table className="mt-2 w-full max-w-xs">
          <thead>
            <tr className="text-left text-muted">
              <th scope="col" className="py-1 font-normal">Month</th>
              <th scope="col" className="py-1 text-right font-normal">Listens</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {months.map((month) => (
              <tr key={month.month} className="border-t border-line">
                <td className="py-1">{month.long}</td>
                <td className="py-1 text-right">{month.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  );
}
