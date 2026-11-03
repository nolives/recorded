import type { ReactNode } from "react";

// One column: its short axis label ("Oct", "8"), its full name for the
// tooltip and table ("October 2026", "Scored 8/10"), and its count.
export type Column = { key: string; axisLabel: string; name: string; count: number };

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

// A column chart of listen counts, used for "Listens per column" and "How you
// score". One series, so no legend: the title says what's plotted. Hover or
// tab to a column to see its name and count; the same numbers are in the
// table underneath.
export function ColumnChart({
  id,
  title,
  subtitle,
  columns,
  nameHeader,
  everyOtherLabelOnPhones = false,
  footnote,
}: {
  id: string;
  title: string;
  subtitle: string;
  columns: Column[];
  nameHeader: string; // the table's first column heading, like "Month"
  everyOtherLabelOnPhones?: boolean; // for long rows of labels like columns
  footnote?: ReactNode;
}) {
  const max = Math.max(...columns.map((column) => column.count));
  const ticks = axisTicks(max);
  const top = ticks[ticks.length - 1];
  // Label only the tallest column (the last one, if tied), so the chart
  // isn't covered in numbers.
  const busiest = max > 0 ? columns.findLastIndex((column) => column.count === max) : -1;

  return (
    <section aria-labelledby={`${id}-title`} className="rounded-lg border border-line bg-surface p-4 sm:p-5">
      <h2 id={`${id}-title`} className="font-semibold">
        {title}
      </h2>
      <p className="text-sm text-muted">{subtitle}</p>

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
              {columns.map((column, index) => {
                const height = (column.count / top) * 100;
                return (
                  <li
                    key={column.key}
                    tabIndex={0}
                    aria-label={`${column.name}: ${plural(column.count)}`}
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
                        {column.count}
                      </span>
                    ) : null}
                    {/* Tooltip: the value leads, the column follows */}
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none absolute z-10 hidden whitespace-nowrap rounded-md border border-line bg-background px-2 py-1 text-xs shadow-lg group-hover:block group-focus-visible:block ${
                        index < 3 ? "left-0" : index > columns.length - 4 ? "right-0" : "left-1/2 -translate-x-1/2"
                      }`}
                      style={{ bottom: `calc(${height}% + 8px)` }}
                    >
                      <span className="block font-semibold">{plural(column.count)}</span>
                      <span className="block text-muted">{column.name}</span>
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>

          {/* Axis labels; optionally every other one on narrow screens so long rows don't collide */}
          <ol aria-hidden="true" className="mt-2 flex text-center text-xs text-muted">
            {columns.map((column, index) => (
              <li
                key={column.key}
                className={`flex-1 ${
                  !everyOtherLabelOnPhones || index % 2 === (columns.length - 1) % 2 ? "" : "invisible sm:visible"
                }`}
              >
                {column.axisLabel}
              </li>
            ))}
          </ol>
        </div>
      </div>

      {footnote ? <p className="mt-3 text-sm text-muted">{footnote}</p> : null}

      <details className="mt-4 text-sm">
        <summary className="cursor-pointer text-muted hover:text-foreground">Show as a table</summary>
        <table className="mt-2 w-full max-w-xs">
          <thead>
            <tr className="text-left text-muted">
              <th scope="col" className="py-1 font-normal">{nameHeader}</th>
              <th scope="col" className="py-1 text-right font-normal">Listens</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {columns.map((column) => (
              <tr key={column.key} className="border-t border-line">
                <td className="py-1">{column.name}</td>
                <td className="py-1 text-right">{column.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  );
}
