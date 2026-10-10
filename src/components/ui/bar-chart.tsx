import { formatDate } from "@/lib/format";

/** A small accessible daily bar chart: one bar per day, zero-filled. */
export function DailyBars({
  data,
  days,
  label,
}: {
  data: { day: string; count: number }[];
  days: number;
  label: string;
}) {
  const counts = new Map(data.map((point) => [point.day, point.count]));
  const series: { day: string; count: number }[] = [];
  const today = new Date();
  for (let offset = days - 1; offset >= 0; offset--) {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    const day = date.toISOString().slice(0, 10);
    series.push({ day, count: counts.get(day) ?? 0 });
  }
  const max = Math.max(1, ...series.map((point) => point.count));
  const total = series.reduce((sum, point) => sum + point.count, 0);

  return (
    <figure>
      <div
        role="img"
        aria-label={`${label}: ${total} in the last ${days} days`}
        className="flex h-40 items-end gap-[3px]"
      >
        {series.map((point) => (
          <div
            key={point.day}
            title={`${formatDate(point.day)}: ${point.count}`}
            className="group relative flex-1 rounded-t bg-primary/80 transition-colors hover:bg-primary"
            style={{
              height: `${Math.max(point.count ? 6 : 2, (point.count / max) * 100)}%`,
              opacity: point.count ? 1 : 0.25,
            }}
          />
        ))}
      </div>
      <figcaption className="mt-2 flex justify-between text-[11px] text-subtle">
        <span>{formatDate(series[0]?.day)}</span>
        <span>Today</span>
      </figcaption>
    </figure>
  );
}

/** Horizontal proportion bars for a breakdown such as installers by plan. */
export function Breakdown({
  items,
  labels,
}: {
  items: { key: string; count: number }[];
  labels: Record<string, string>;
}) {
  const total = items.reduce((sum, item) => sum + item.count, 0) || 1;
  return (
    <ul className="space-y-3">
      {items
        .slice()
        .sort((a, b) => b.count - a.count)
        .map((item) => (
          <li key={item.key}>
            <div className="flex justify-between text-[13px]">
              <span className="text-ink">{labels[item.key] ?? item.key}</span>
              <span>{item.count}</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-ink/5">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${(item.count / total) * 100}%` }}
              />
            </div>
          </li>
        ))}
      {items.length === 0 ? <li className="text-sm">No data yet.</li> : null}
    </ul>
  );
}
