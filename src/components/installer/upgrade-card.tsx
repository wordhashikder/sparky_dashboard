import { useMutation } from "@tanstack/react-query";
import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api";
import { installerApi } from "@/lib/endpoints";

const perks = [
  "Matched quote requests from homeowners near you",
  "Direct enquiries from your profile",
  "Message customers and send quotes in the dashboard",
  "Full profile: photos, accreditations, every service",
];

/** Shown to Free-plan installers: what Pro and Premium add, and how to upgrade. */
export function UpgradeCard({ compact }: { compact?: boolean }) {
  const toast = useToast();
  const checkout = useMutation({
    mutationFn: installerApi.checkout,
    onSuccess: ({ url }) => window.location.assign(url),
    onError: (error) =>
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Couldn't start the upgrade.",
      ),
  });

  return (
    <section className="overflow-hidden rounded-2xl border border-[#e3efec] bg-gradient-to-br from-mint-soft to-white p-5 shadow-soft sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-xl">
          <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.1em] text-primary uppercase">
            <Sparkles aria-hidden className="size-4" />
            Your listing is on the Free plan
          </p>
          <h2 className="mt-2 text-lg font-bold">
            Upgrade to start receiving customer enquiries
          </h2>
          {!compact ? (
            <ul className="mt-3 grid gap-1.5 text-sm sm:grid-cols-2">
              {perks.map((perk) => (
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
          <Button
            variant="outline"
            loading={checkout.isPending && checkout.variables === "pro"}
            disabled={checkout.isPending}
            onClick={() => checkout.mutate("pro")}
          >
            Upgrade to Pro
          </Button>
          <Button
            loading={checkout.isPending && checkout.variables === "premium"}
            disabled={checkout.isPending}
            onClick={() => checkout.mutate("premium")}
          >
            Go Premium
          </Button>
        </div>
      </div>
    </section>
  );
}
