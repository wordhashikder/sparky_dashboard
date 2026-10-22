import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { useEffect } from "react";
import { useSearchParams } from "react-router";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, PageLoader } from "@/components/ui/states";
import { useRefreshAfterBilling } from "@/lib/billing";
import { billingApi } from "@/lib/endpoints";

/** Stripe sends people here after paying: `/billing/success?session_id=cs_…`. */
export function BillingSuccessPage() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id") ?? "";
  const refreshAfter = useRefreshAfterBilling();
  const status = useQuery({
    queryKey: ["billing", "checkout", sessionId],
    queryFn: () => billingApi.checkoutStatus(sessionId),
    enabled: /^cs_[A-Za-z0-9_]+$/.test(sessionId),
    // The bank can take a moment: look again until the payment settles.
    refetchInterval: (query) =>
      query.state.data?.state === "processing" ? 2500 : false,
    retry: 1,
  });
  const state = status.data?.state;
  useEffect(() => {
    if (state === "paid") void refreshAfter();
  }, [state, refreshAfter]);

  const toBilling = (
    <ButtonLink to="/billing" variant="outline">
      Plan &amp; billing
    </ButtonLink>
  );

  if (!sessionId || status.isError) {
    return (
      <Card>
        <EmptyState
          icon={<XCircle aria-hidden className="size-6" strokeWidth={1.75} />}
          title="We couldn't confirm that payment"
          text="If you were charged, your plan will appear shortly. Check Plan & billing, or contact us and we'll sort it out."
          action={toBilling}
        />
      </Card>
    );
  }
  if (status.isPending) return <PageLoader label="Confirming your payment…" />;
  if (state === "paid") {
    return (
      <Card>
        <EmptyState
          icon={
            <CheckCircle2 aria-hidden className="size-6" strokeWidth={1.75} />
          }
          title={`You're on the ${status.data.plan?.name ?? "new"} plan`}
          text="Thank you. Your plan is active and a receipt is on its way to your inbox."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <ButtonLink to="/">See your leads</ButtonLink>
              {toBilling}
            </div>
          }
        />
      </Card>
    );
  }
  if (state === "processing") {
    return (
      <Card>
        <EmptyState
          icon={<Clock aria-hidden className="size-6" strokeWidth={1.75} />}
          title="Waiting for your bank"
          text="Your payment is still being confirmed. This page updates by itself, so you can leave it open."
        />
      </Card>
    );
  }
  return (
    <Card>
      <EmptyState
        icon={<XCircle aria-hidden className="size-6" strokeWidth={1.75} />}
        title="That payment wasn't completed"
        text="You haven't been charged. You can pick a plan and try again."
        action={toBilling}
      />
    </Card>
  );
}

/** Stripe sends people here if they leave checkout without paying. */
export function BillingCancelledPage() {
  return (
    <Card>
      <EmptyState
        icon={<XCircle aria-hidden className="size-6" strokeWidth={1.75} />}
        title="Checkout cancelled"
        text="No problem. You haven't been charged and your plan hasn't changed."
        action={
          <ButtonLink to="/billing">Back to Plan &amp; billing</ButtonLink>
        }
      />
    </Card>
  );
}
