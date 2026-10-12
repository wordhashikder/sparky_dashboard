import {
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";

/**
 * A button that opens a small panel (menus, notifications). Closes on Escape,
 * on a click outside and after choosing an item.
 */
export function Popover({
  trigger,
  label,
  align = "right",
  className,
  buttonClassName,
  children,
}: {
  trigger: ReactNode;
  label: string;
  align?: "left" | "right";
  className?: string;
  buttonClassName?: string;
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        ref={button}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className={cn("cursor-pointer", buttonClassName)}
      >
        {trigger}
      </button>
      {open ? (
        <div
          id={panelId}
          className={cn(
            "absolute top-[calc(100%+8px)] z-50 min-w-60 overflow-hidden rounded-xl border border-line bg-white text-sm shadow-float",
            align === "right" ? "right-0" : "left-0",
            className,
          )}
        >
          {children(close)}
        </div>
      ) : null}
    </div>
  );
}
