import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const tones = {
  green: "bg-primary-soft text-primary",
  blue: "bg-sky-50 text-sky-700",
  amber: "bg-amber-50 text-amber-700",
  violet: "bg-violet-50 text-violet-700",
  coral: "bg-peach text-[#c2410c]",
} as const;

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "green",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon: LucideIcon;
  tone?: keyof typeof tones;
}) {
  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-medium">{label}</p>
        <span
          className={cn(
            "flex size-9 items-center justify-center rounded-lg",
            tones[tone],
          )}
        >
          <Icon aria-hidden className="size-[18px]" strokeWidth={1.75} />
        </span>
      </div>
      <p className="mt-2 text-[28px] font-bold leading-none text-ink">
        {value}
      </p>
      {hint ? <p className="mt-2 text-xs text-subtle">{hint}</p> : null}
    </div>
  );
}
