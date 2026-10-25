import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowRight, Check } from "lucide-react";
import type { ReactNode } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api";
import { billingApi } from "@/lib/endpoints";
import { formatPence } from "@/lib/format";
import type { PlanOption } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * The plans a free installer can buy, with the checkout they start from here.
 *
 * Everything comes from Plans & pricing (the plan list, prices and feature lines), so a
 * plan the team adds or changes shows up in these cards straight away. Shared by the
 * New Leads banner and the locked-enquiry page.
 */
export function useUpgradePlans() {
  const toast = useToast();
  const summary = useQuery({
    queryKey: ["billing", "summary"],
    queryFn: billingApi.summary,
    staleTime: 60_000,
  });
  const checkout = useMutation({
    mutationFn: billingApi.checkout,
    onSuccess: ({ url }) => window.location.assign(url),
    onError: (error) =>
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Couldn't start the upgrade.",
      ),
  });

  const plans = (summary.data?.options ?? []).filter(
    (option) => option.action === "subscribe" || option.action === "upgrade",
  );
  return {
    plans,
    planName: summary.data?.plan.name ?? "Free",
    loading: summary.isPending,
    canBuy: !!summary.data?.billing_enabled && plans.length > 0,
    checkout,
  };
}

type Upgrade = ReturnType<typeof useUpgradePlans>;

/** "Pro", "Pro or Premium", "Pro, Premium or Business". */
export function joinPlanNames(plans: PlanOption[]): string {
  const names = plans.map((plan) => plan.name);
  if (names.length <= 1) return names[0] ?? "paid";
  return `${names.slice(0, -1).join(", ")} or ${names[names.length - 1]}`;
}

/** A ticked line: the filled green circle used in the upgrade panels. */
export function TickList({
  items,
  className,
}: {
  items: string[];
  className?: string;
}) {
  return (
    <ul className={cn("grid gap-x-6 gap-y-3.5", className)}>
      {items.map((item) => (
        <li key={item} className="flex items-center gap-3 text-[15px] text-ink">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-white">
            <Check aria-hidden className="size-3.5" strokeWidth={3} />
          </span>
          {item}
        </li>
      ))}
    </ul>
  );
}

function PlanOfferCard({
  plan,
  upgrade,
  maxFeatures,
  sparkle,
}: {
  plan: PlanOption;
  upgrade: Upgrade;
  maxFeatures: number;
  sparkle: boolean;
}) {
  const { checkout } = upgrade;
  const features = plan.features.slice(0, maxFeatures);
  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl bg-white p-5 sm:p-6",
        plan.is_popular
          ? "border-2 border-primary shadow-card"
          : "border border-line shadow-soft",
      )}
    >
      {plan.is_popular ? (
        <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary px-4 py-1 text-[11px] leading-4 font-bold tracking-[0.06em] whitespace-nowrap text-white uppercase">
          Most popular
        </span>
      ) : null}
      {sparkle ? <Sparkle /> : null}
      <h3 className="text-lg font-bold text-ink">{plan.name}</h3>
      <p className="mt-1 flex items-baseline gap-1.5">
        <span className="text-[28px] leading-9 font-extrabold tracking-[-0.02em] text-ink">
          {plan.price_pence !== null
            ? formatPence(plan.price_pence, plan.currency)
            : "—"}
        </span>
        <span className="text-sm text-muted">/month</span>
      </p>
      {features.length > 0 ? (
        <ul className="mt-4 mb-5 space-y-2.5 text-sm text-ink">
          {features.map((feature) => (
            <li key={feature} className="flex items-start gap-2.5">
              <Check
                aria-hidden
                className="mt-0.5 size-4 shrink-0 text-primary"
                strokeWidth={2.25}
              />
              {feature}
            </li>
          ))}
        </ul>
      ) : (
        <div className="mb-5" />
      )}
      <Button
        className="mt-auto w-full px-3"
        variant={plan.is_popular ? "primary" : "outline"}
        loading={checkout.isPending && checkout.variables === plan.key}
        disabled={checkout.isPending}
        onClick={() => checkout.mutate(plan.key)}
      >
        Upgrade to {plan.name}
        <ArrowRight aria-hidden className="size-4" />
      </Button>
    </div>
  );
}

/** Three short strokes beside a card, drawn as decoration only. */
function Sparkle() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 40 40"
      className="pointer-events-none absolute -top-6 -right-4 hidden size-12 text-primary/70 2xl:block"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M6 14 L12 18" />
      <path d="M18 4 L20 12" />
      <path d="M32 6 L26 12" />
    </svg>
  );
}

/**
 * The paid plans as cards, with the most popular one highlighted. Falls back to a link to
 * the billing page when checkout isn't available, and shows placeholders while loading.
 */
export function PlanOffers({
  upgrade,
  maxFeatures,
  sparkle = false,
  className,
}: {
  upgrade: Upgrade;
  maxFeatures: number;
  sparkle?: boolean;
  className?: string;
}) {
  const { plans, canBuy, loading } = upgrade;
  if (loading) {
    return (
      <div className={cn("grid gap-4 sm:grid-cols-2", className)}>
        {[0, 1].map((index) => (
          <div
            key={index}
            className="h-64 animate-pulse rounded-2xl border border-line bg-white/70"
          />
        ))}
      </div>
    );
  }
  if (!canBuy) {
    return (
      <div className={cn("flex items-center", className)}>
        <ButtonLink to="/billing" size="lg">
          See plans
          <ArrowRight aria-hidden className="size-4" />
        </ButtonLink>
      </div>
    );
  }
  return (
    <div
      className={cn(
        "grid items-stretch gap-4",
        plans.length <= 2
          ? "sm:grid-cols-2"
          : "[grid-template-columns:repeat(auto-fit,minmax(14rem,1fr))]",
        className,
      )}
    >
      {plans.map((plan, index) => (
        <PlanOfferCard
          key={plan.key}
          plan={plan}
          upgrade={upgrade}
          maxFeatures={maxFeatures}
          sparkle={sparkle && index === plans.length - 1 && !plan.is_popular}
        />
      ))}
    </div>
  );
}

/** A large curved arrow from the pitch to the plan cards (wide screens only). */
export function PitchArrow({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 100 60"
      className={cn("hidden text-primary 2xl:block", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 52 C 34 56, 70 40, 92 10" />
      <path d="M78 10 L92 10 L90 25" />
    </svg>
  );
}

/** The panel's shell: the soft green card both upgrade layouts sit in. */
export function UpgradePanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-3xl border border-[#d9efe3] bg-gradient-to-br from-[#e9f7ef] via-[#f1faf5] to-white p-5 shadow-soft sm:p-7 lg:p-8",
        className,
      )}
    >
      {children}
    </section>
  );
}
