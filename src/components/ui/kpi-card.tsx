import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { Kpi } from "@/lib/types";
import { cn } from "@/lib/utils";

const tones = {
  green: "bg-primary-soft text-primary",
  blue: "bg-sky-50 text-sky-700",
  amber: "bg-amber-50 text-amber-700",
  violet: "bg-violet-50 text-violet-700",
  coral: "bg-peach text-[#c2410c]",
} as const;

/**
 * A headline number with its change against the previous period. `points`
 * reports the change in percentage points (for rates) instead of percent.
 */
export function KpiCard({
  label,
  kpi,
  value,
  icon: Icon,
  tone = "green",
  points = false,
}: {
  label: string;
  kpi: Kpi;
  value?: ReactNode;
  icon: LucideIcon;
  tone?: keyof typeof tones;
  points?: boolean;
}) {
  const change = kpi.change;
  const up = change !== null && change > 0;
  const down = change !== null && change < 0;
  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-medium">{label}</p>
        <span
          className={cn(
            "flex size-10 items-center justify-center rounded-xl",
            tones[tone],
          )}
        >
          <Icon aria-hidden className="size-5" strokeWidth={1.75} />
        </span>
      </div>
      <div className="mt-1 flex flex-wrap items-end gap-x-3 gap-y-1">
        <p className="text-[30px] font-bold leading-none tracking-[-0.01em] text-ink">
          {value ?? kpi.value}
        </p>
        {change !== null ? (
          <span
            className={cn(
              "mb-0.5 inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold",
              up && "bg-primary-soft text-forest",
              down && "bg-red-50 text-red-700",
              !up && !down && "bg-ink/5 text-ink",
            )}
          >
            {up ? (
              <ArrowUpRight aria-hidden className="size-3.5" />
            ) : down ? (
              <ArrowDownRight aria-hidden className="size-3.5" />
            ) : null}
            {up ? "+" : ""}
            {change}
            {points ? " pts" : "%"}
            <span className="sr-only"> compared with the previous period</span>
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-xs text-subtle">{kpi.hint}</p>
    </div>
  );
}

/** "3 of 5" quotes received, as a slim bar. */
export function ProgressBar({
  value,
  max,
  label,
  className,
}: {
  value: number;
  max: number;
  label?: string;
  className?: string;
}) {
  const safeMax = Math.max(1, max);
  const ratio = Math.min(1, value / safeMax);
  return (
    <div className={cn("min-w-28", className)}>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="font-medium text-ink">
          {value} of {max}
        </span>
        {label ? <span className="text-subtle">{label}</span> : null}
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-valuenow={value}
        aria-label={label ? `${value} of ${max} ${label}` : undefined}
        className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink/8"
      >
        <div
          className={cn(
            "h-full rounded-full",
            ratio >= 1 ? "bg-primary" : ratio > 0 ? "bg-primary/70" : "",
          )}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
    </div>
  );
}
