import { Eye, EyeOff } from "lucide-react";
import { type ComponentProps, type ReactNode, useState } from "react";
import { cn } from "@/lib/utils";

const control =
  "block w-full rounded-lg border border-line bg-white px-3.5 text-sm text-ink outline-none transition-shadow placeholder:text-subtle focus:border-primary focus:ring-4 focus:ring-primary/15 disabled:bg-surface disabled:text-subtle aria-invalid:border-red-500";

type FieldProps = {
  label: ReactNode;
  htmlFor: string;
  error?: string;
  hint?: ReactNode;
  /** Shown at the right of the label, e.g. a character counter. */
  aside?: ReactNode;
  className?: string;
  children: ReactNode;
};

export function Field({
  label,
  htmlFor,
  error,
  hint,
  aside,
  className,
  children,
}: FieldProps) {
  return (
    <div className={className}>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="text-[13px] font-semibold text-ink">
          {label}
        </label>
        {aside ? <span className="text-xs text-subtle">{aside}</span> : null}
      </div>
      {children}
      {error ? (
        <p
          id={`${htmlFor}-error`}
          role="alert"
          className="mt-1.5 text-xs text-red-600"
        >
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-subtle">{hint}</p>
      ) : null}
    </div>
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(control, "h-10", className)} {...props} />;
}

/** A password field with a button that shows or hides what was typed. */
export function PasswordInput({
  className,
  ...props
}: Omit<ComponentProps<"input">, "type">) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        {...props}
        type={visible ? "text" : "password"}
        className={cn(control, "h-10 pr-11", className)}
      />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        className="absolute top-1/2 right-1.5 grid size-8 -translate-y-1/2 cursor-pointer place-items-center rounded-md text-subtle transition-colors hover:bg-ink/5 hover:text-ink focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
      >
        {visible ? (
          <EyeOff aria-hidden className="size-[18px]" />
        ) : (
          <Eye aria-hidden className="size-[18px]" />
        )}
      </button>
    </div>
  );
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(control, "min-h-24 py-2.5 leading-relaxed", className)}
      {...props}
    />
  );
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return (
    <select
      className={cn(control, "h-10 cursor-pointer pr-8", className)}
      {...props}
    />
  );
}

export function Checkbox({
  label,
  className,
  ...props
}: ComponentProps<"input"> & { label: ReactNode }) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-2.5 text-sm text-ink",
        className,
      )}
    >
      <input
        type="checkbox"
        className="size-4 shrink-0 cursor-pointer rounded border-line accent-primary"
        {...props}
      />
      {label}
    </label>
  );
}

/** Form-level success or error banner. */
export function Notice({
  tone,
  children,
  className,
}: {
  tone: "success" | "error" | "info" | "warning";
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "rounded-lg px-4 py-3 text-sm",
        tone === "success" && "bg-primary-soft text-forest",
        tone === "error" && "bg-red-50 text-red-700",
        tone === "info" && "bg-mint-soft text-ink",
        tone === "warning" && "bg-amber-50 text-amber-900",
        className,
      )}
    >
      {children}
    </div>
  );
}
