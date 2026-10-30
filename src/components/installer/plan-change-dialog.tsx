import { X } from "lucide-react";
import { type ComponentType, useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";

export interface PlanChangePoint {
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  text: string;
}

export interface PlanChangeDialogContent {
  /** "warning": leaving a plan (amber "!"). "positive": moving up (green arrow). */
  tone: "warning" | "positive";
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  title: string;
  body: string;
  points: [PlanChangePoint, PlanChangePoint];
  /** The prominent green button. For a downgrade this is "Keep Pro plan". */
  primaryLabel: string;
  /** The quieter underlined link. For a downgrade this is the change itself. */
  linkLabel: string;
  /** Which of the two makes the change: the link when leaving, the button when upgrading. */
  confirm: "link" | "primary";
}

/**
 * Asks the installer to confirm a plan change, in place of the browser's own pop-up.
 * Built on the native <dialog> (focus is trapped, Escape and a click outside close it).
 * Closing never changes anything; only the confirming action does, and the dialog
 * stays open, with that action busy, until the change has gone through.
 */
export function PlanChangeDialog({
  content,
  onConfirm,
  onClose,
}: {
  /** `null` while no change is being asked about. */
  content: PlanChangeDialogContent | null;
  /** Makes the change. A failure is reported by the caller; the dialog closes either way. */
  onConfirm: () => Promise<unknown>;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const bodyId = useId();
  const [busy, setBusy] = useState(false);
  const open = content !== null;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  async function confirm() {
    setBusy(true);
    try {
      await onConfirm();
    } catch {
      // Already shown to the installer by the caller (a toast).
    } finally {
      setBusy(false);
      onClose();
    }
  }

  function dismiss() {
    if (!busy) onClose();
  }

  const Icon = content?.icon;
  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: a click on the backdrop closes it; keyboard users have Escape (onCancel) and the Close button
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      onClose={dismiss}
      onCancel={(event) => {
        event.preventDefault();
        dismiss();
      }}
      onClick={(event) => {
        if (event.target === ref.current) dismiss();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-[500px] overflow-visible rounded-3xl border-0 bg-white p-0 shadow-float backdrop:bg-ink/45 backdrop:backdrop-blur-[1px]"
    >
      {content && Icon ? (
        <div className="relative px-6 pt-10 pb-6 text-center sm:px-9">
          <button
            type="button"
            onClick={dismiss}
            aria-label="Close"
            className="absolute top-4 right-4 flex size-9 cursor-pointer items-center justify-center rounded-full text-muted transition-colors hover:bg-ink/5 hover:text-ink"
          >
            <X aria-hidden className="size-5" />
          </button>
          <span
            aria-hidden
            className={cn(
              "mx-auto flex size-16 items-center justify-center rounded-full",
              content.tone === "warning"
                ? "bg-amber-100 text-amber-500"
                : "bg-primary-soft text-primary",
            )}
          >
            <Icon className="size-8" />
          </span>
          <h2
            id={titleId}
            className="mt-5 text-[24px] leading-tight font-bold tracking-tight text-ink"
          >
            {content.title}
          </h2>
          <p
            id={bodyId}
            className="mt-3 text-[14.5px] leading-relaxed text-muted"
          >
            {content.body}
          </p>

          <ul className="mt-6 grid gap-4 rounded-2xl bg-mint-soft p-4 text-left sm:grid-cols-[1fr_auto_1fr] sm:gap-0 sm:p-5">
            <Point point={content.points[0]} />
            <li
              aria-hidden
              className="hidden w-px bg-primary/15 sm:mx-4 sm:block"
            />
            <Point point={content.points[1]} />
          </ul>

          <div className="mt-7 flex flex-col-reverse items-center gap-4 sm:flex-row sm:justify-between sm:gap-6">
            {content.confirm === "link" ? (
              <>
                <button
                  type="button"
                  onClick={() => void confirm()}
                  disabled={busy}
                  aria-busy={busy || undefined}
                  className="cursor-pointer px-1 py-2 text-[15px] font-semibold text-primary underline decoration-2 underline-offset-4 transition-colors hover:text-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busy ? "Switching…" : content.linkLabel}
                </button>
                <Button
                  size="lg"
                  className="w-full sm:w-auto sm:min-w-44"
                  onClick={dismiss}
                  disabled={busy}
                  autoFocus
                >
                  {content.primaryLabel}
                </Button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={dismiss}
                  disabled={busy}
                  className="cursor-pointer px-1 py-2 text-[15px] font-semibold text-primary underline decoration-2 underline-offset-4 transition-colors hover:text-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {content.linkLabel}
                </button>
                <Button
                  size="lg"
                  className="w-full sm:w-auto sm:min-w-44"
                  loading={busy}
                  onClick={() => void confirm()}
                  autoFocus
                >
                  {content.primaryLabel}
                </Button>
              </>
            )}
          </div>
        </div>
      ) : null}
    </dialog>
  );
}

function Point({ point }: { point: PlanChangePoint }) {
  const Icon = point.icon;
  return (
    <li className="flex items-center gap-3">
      <span
        aria-hidden
        className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary"
      >
        <Icon className="size-5" />
      </span>
      <span className="text-[13.5px] leading-snug text-ink">{point.text}</span>
    </li>
  );
}
