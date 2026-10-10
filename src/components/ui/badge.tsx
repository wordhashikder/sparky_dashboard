import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const tones = {
  neutral: "bg-ink/5 text-ink",
  green: "bg-primary-soft text-forest",
  blue: "bg-sky-50 text-sky-800",
  amber: "bg-amber-50 text-amber-800",
  red: "bg-red-50 text-red-700",
  violet: "bg-violet-50 text-violet-800",
  mint: "bg-mint-soft text-forest",
} as const;

export type BadgeTone = keyof typeof tones;

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export const statusTone: Record<string, BadgeTone> = {
  approved: "green",
  published: "green",
  accepted: "green",
  won: "green",
  matched: "green",
  active: "green",
  pending: "amber",
  sent: "blue",
  new: "blue",
  viewed: "violet",
  contacted: "mint",
  draft: "neutral",
  rejected: "red",
  declined: "red",
  lost: "red",
  suspended: "red",
  unmatched: "amber",
  withdrawn: "neutral",
  past_due: "red",
  premium: "violet",
  pro: "blue",
  free: "neutral",
};
