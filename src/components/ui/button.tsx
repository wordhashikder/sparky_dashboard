import { Loader2 } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { Link, type LinkProps } from "react-router";
import { cn } from "@/lib/utils";

const variants = {
  primary:
    "bg-primary text-white shadow-[0_1px_2px_rgb(10_155_83/0.3)] hover:bg-primary-dark disabled:bg-primary/60",
  outline:
    "border border-line bg-white text-ink hover:border-ink/30 disabled:text-subtle",
  ghost: "text-ink hover:bg-ink/5 disabled:text-subtle",
  danger: "bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300",
  dark: "bg-ink text-white hover:bg-ink/90",
} as const;

const sizes = {
  sm: "h-8 rounded-md px-3 text-[13px] gap-1.5",
  md: "h-10 rounded-lg px-4 text-sm gap-2",
  lg: "h-12 rounded-lg px-6 text-[15px] gap-2",
  icon: "size-9 rounded-lg",
} as const;

type StyleProps = {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  className?: string;
};

export function buttonClasses({
  variant = "primary",
  size = "md",
  className,
}: StyleProps) {
  return cn(
    "inline-flex shrink-0 cursor-pointer items-center justify-center font-semibold whitespace-nowrap transition-colors disabled:cursor-not-allowed",
    variants[variant],
    sizes[size],
    className,
  );
}

type ButtonProps = ComponentProps<"button"> &
  StyleProps & { loading?: boolean; icon?: ReactNode };

export function Button({
  variant,
  size,
  className,
  loading,
  icon,
  children,
  disabled,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses({ variant, size, className })}
      {...props}
    >
      {loading ? <Loader2 aria-hidden className="size-4 animate-spin" /> : icon}
      {children}
    </button>
  );
}

export function ButtonLink({
  variant,
  size,
  className,
  children,
  ...props
}: LinkProps & StyleProps) {
  return (
    <Link className={buttonClasses({ variant, size, className })} {...props}>
      {children}
    </Link>
  );
}
