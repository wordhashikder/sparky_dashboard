import { useMutation, useQuery } from "@tanstack/react-query";
import { Check, Sparkles } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api";
import { billingApi } from "@/lib/endpoints";
import { formatPence } from "@/lib/format";

/**
 * Shown to installers on the free plan: what the paid plans add, and how to upgrade.
 * The plans, prices and perks all come from Plans & pricing in the team's dashboard.
 * Free installers are told about every enquiry in their area, so the card asks them to
 * upgrade before they can open one and respond.
 */
export function UpgradeCard({
  compact,
  title = "Upgrade to view and respond to customer enquiries",
}: {
  compact?: boolean;
  title?: string;
}) {
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
  const showcase = plans.find((plan) => plan.is_popular) ?? plans[0];
  const canBuy = summary.data?.billing_enabled && plans.length > 0;

  return (
    <section className="overflow-hidden rounded-2xl border border-[#e3efec] bg-gradient-to-br from-mint-soft to-white p-5 shadow-soft sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-xl">
          <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.1em] text-primary uppercase">
            <Sparkles aria-hidden className="size-4" />
            Your listing is on the {summary.data?.plan.name ?? "Free"} plan
          </p>
          <h2 className="mt-2 text-lg font-bold">{title}</h2>
          {!compact && showcase && showcase.features.length > 0 ? (
            <ul className="mt-3 grid gap-1.5 text-sm sm:grid-cols-2">
              {showcase.features.map((perk) => (
                <li key={perk} className="flex items-start gap-2">
                  <Check
                    aria-hidden
                    className="mt-0.5 size-4 shrink-0 text-primary"
                  />
                  {perk}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {canBuy ? (
            plans.map((plan) => (
              <Button
                key={plan.key}
                variant={plan === showcase ? "primary" : "outline"}
                loading={checkout.isPending && checkout.variables === plan.key}
                disabled={checkout.isPending}
                onClick={() => checkout.mutate(plan.key)}
              >
                {plan.name}
                {plan.price_pence !== null
                  ? ` · ${formatPence(plan.price_pence, plan.currency)}/mo`
                  : ""}
              </Button>
            ))
          ) : (
            <ButtonLink to="/billing" variant="primary">
              See plans
            </ButtonLink>
          )}
        </div>
      </div>
    </section>
  );
}
