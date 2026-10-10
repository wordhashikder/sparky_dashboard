import { AlertTriangle, Inbox, Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "./button";

export function Spinner({ className }: { className?: string }) {
  return (
    <Loader2
      aria-hidden
      className={cn("size-5 animate-spin text-primary", className)}
    />
  );
}

export function PageLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <div
      role="status"
      className="flex min-h-48 items-center justify-center gap-3 text-sm"
    >
      <Spinner />
      {label}
    </div>
  );
}

export function EmptyState({
  title,
  text,
  action,
  icon,
}: {
  title: string;
  text?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-mint-soft text-primary">
        {icon ?? <Inbox aria-hidden className="size-6" strokeWidth={1.75} />}
      </span>
      <h3 className="mt-4 text-[15px] font-semibold">{title}</h3>
      {text ? <p className="mt-1 max-w-md text-sm">{text}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry?: () => void;
}) {
  const message =
    error instanceof ApiError
      ? error.message
      : "Something went wrong while loading this page.";
  return (
    <div
      role="alert"
      className="flex flex-col items-center px-6 py-14 text-center"
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-red-50 text-red-600">
        <AlertTriangle aria-hidden className="size-6" strokeWidth={1.75} />
      </span>
      <h3 className="mt-4 text-[15px] font-semibold">Couldn't load this</h3>
      <p className="mt-1 max-w-md text-sm">{message}</p>
      {onRetry ? (
        <Button variant="outline" size="sm" className="mt-5" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}
