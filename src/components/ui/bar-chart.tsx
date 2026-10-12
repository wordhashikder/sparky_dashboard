import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

const monthLabel = new Intl.DateTimeFormat("en-GB", {
  month: "short",
  timeZone: "UTC",
});

/** Rounds the axis maximum up to a friendly number (5, 10, 20, 50…). */
function niceMax(value: number) {
  if (value <= 5) return 5;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const steps = [1, 2, 2.5, 5, 10];
  const step = steps.find((s) => s * magnitude >= value) ?? 10;
  return step * magnitude;
}

/**
 * Leads and quotes per month, as paired bars with a light grid. The figures are
 * also in a visually hidden table for screen readers.
 */
export function MonthlyBars({
  data,
}: {
  data: { month: string; leads: number; quotes: number }[];
}) {
  const max = niceMax(Math.max(1, ...data.flatMap((d) => [d.leads, d.quotes])));
  const ticks = [max, (max * 3) / 4, max / 2, max / 4, 0];
  return (
    <figure>
      <div className="flex items-center gap-5 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-primary" /> Leads
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-[#9fd9bd]" /> Quotes sent
        </span>
      </div>
      <div className="mt-4 grid grid-cols-[auto_1fr] gap-3" aria-hidden>
        <div className="flex h-52 flex-col justify-between text-right text-[11px] text-subtle">
          {ticks.map((tick) => (
            <span key={tick} className="-translate-y-1/2 leading-none">
              {formatNumber(Math.round(tick))}
            </span>
          ))}
        </div>
        <div className="relative h-52">
          <div className="absolute inset-0 flex flex-col justify-between">
            {ticks.map((tick) => (
              <span key={tick} className="border-t border-dashed border-line" />
            ))}
          </div>
          <div className="relative flex h-full items-end justify-around gap-2">
            {data.map((point) => (
              <div
                key={point.month}
                className="flex h-full flex-1 items-end justify-center gap-1"
              >
                {(
                  [
                    ["leads", point.leads, "bg-primary"],
                    ["quotes", point.quotes, "bg-[#9fd9bd]"],
                  ] as const
                ).map(([key, count, color]) => (
                  <div
                    key={key}
                    title={`${monthLabel.format(new Date(point.month))}: ${count} ${key}`}
                    className={cn(
                      "w-full max-w-5 rounded-t-md transition-opacity hover:opacity-80",
                      color,
                    )}
                    style={{
                      height: `${count ? Math.max(3, (count / max) * 100) : 1}%`,
                      opacity: count ? 1 : 0.35,
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
        <span />
        <div className="flex justify-around gap-2 text-[11px] text-subtle">
          {data.map((point) => (
            <span key={point.month} className="flex-1 text-center">
              {monthLabel.format(new Date(point.month))}
            </span>
          ))}
        </div>
      </div>
      <table className="sr-only">
        <caption>Leads and quotes sent per month</caption>
        <thead>
          <tr>
            <th>Month</th>
            <th>Leads</th>
            <th>Quotes sent</th>
          </tr>
        </thead>
        <tbody>
          {data.map((point) => (
            <tr key={point.month}>
              <td>{monthLabel.format(new Date(point.month))}</td>
              <td>{point.leads}</td>
              <td>{point.quotes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

/** Horizontal proportion bars, largest first (e.g. leads by area). */
export function Breakdown({
  items,
  labels = {},
  empty = "No data yet.",
}: {
  items: { key: string; count: number }[];
  labels?: Record<string, string>;
  empty?: string;
}) {
  const max = Math.max(1, ...items.map((item) => item.count));
  if (items.length === 0) return <p className="text-sm">{empty}</p>;
  return (
    <ul className="space-y-3.5">
      {items
        .slice()
        .sort((a, b) => b.count - a.count)
        .map((item, index) => (
          <li key={item.key}>
            <div className="flex justify-between gap-3 text-[13px]">
              <span className="truncate text-ink">
                {labels[item.key] ?? item.key}
              </span>
              <span className="font-semibold text-ink">
                {formatNumber(item.count)}
              </span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-ink/5">
              <div
                className={cn(
                  "h-full rounded-full",
                  index === 0 ? "bg-primary" : "bg-primary/60",
                )}
                style={{ width: `${(item.count / max) * 100}%` }}
              />
            </div>
          </li>
        ))}
    </ul>
  );
}
