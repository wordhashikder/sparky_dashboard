import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowUp,
  BellOff,
  CalendarClock,
  Check,
  CreditCard,
  ExternalLink,
  FileText,
  Zap,
} from "lucide-react";
import { useState } from "react";
import {
  PlanChangeDialog,
  type PlanChangeDialogContent,
} from "@/components/installer/plan-change-dialog";
import { Badge, statusTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Notice } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState, ErrorState, PageLoader } from "@/components/ui/states";
import { Toggle } from "@/components/ui/switch";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api";
import {
  billingReasonLabels,
  invoiceStatusLabels,
  invoiceStatusTones,
  useRefreshAfterBilling,
} from "@/lib/billing";
import { billingApi } from "@/lib/endpoints";
import { formatDate, formatDateTime, formatPence, timeAgo } from "@/lib/format";
import type { BillingSummary, PlanOption } from "@/lib/types";
import { cn } from "@/lib/utils";

const SUMMARY_KEY = ["billing", "summary"];

/**
 * The installer's plan and payments: what they are on, when it renews, switching plan,
 * stopping auto-renewal, and their invoices. Plans and prices come from the team's
 * Plans & pricing page; the card is entered on Stripe's own pages, never here.
 */
export default function BillingPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const refreshAfter = useRefreshAfterBilling();
  const summary = useQuery({
    queryKey: SUMMARY_KEY,
    queryFn: billingApi.summary,
  });
  // The change the installer is being asked to confirm (see PlanChangeDialog).
  const [asking, setAsking] = useState<{
    content: PlanChangeDialogContent;
    run: () => Promise<unknown>;
  } | null>(null);

  const onError = (error: unknown) =>
    toast.error(
      error instanceof ApiError
        ? error.message
        : "Something went wrong. Please try again.",
    );
  /** A change that returns the refreshed summary. */
  const change = (
    run: (arg: string | undefined) => Promise<BillingSummary>,
    done: (result: BillingSummary) => string,
  ) => ({
    mutationFn: run,
    onSuccess: (result: BillingSummary) => {
      queryClient.setQueryData(SUMMARY_KEY, result);
      void refreshAfter();
      toast.success(done(result));
    },
    onError,
  });

  const changePlan = useMutation(
    change(
      (plan) => billingApi.changePlan(plan ?? ""),
      (result) =>
        result.pending_change
          ? `Done. You'll move to ${result.pending_change.plan.name} when this billing period ends.`
          : `You're now on the ${result.plan.name} plan.`,
    ),
  );
  const cancel = useMutation(
    change(
      () => billingApi.cancel(),
      () => "Auto-renewal is off. Your plan stays until the period ends.",
    ),
  );
  const resume = useMutation(
    change(
      () => billingApi.resume(),
      () => "Auto-renewal is back on.",
    ),
  );
  const dropChange = useMutation(
    change(
      () => billingApi.cancelChange(),
      () => "Plan change cancelled. You'll stay on your current plan.",
    ),
  );
  const subscribe = useMutation({
    mutationFn: billingApi.checkout,
    onSuccess: ({ url }) => window.location.assign(url),
    onError,
  });
  const portal = useMutation({
    mutationFn: billingApi.portal,
    onSuccess: ({ url }) => window.location.assign(url),
    onError,
  });

  if (summary.isPending) return <PageLoader />;
  if (summary.isError) {
    return (
      <ErrorState
        error={summary.error}
        onRetry={() => void summary.refetch()}
      />
    );
  }
  const data = summary.data;
  const busy =
    changePlan.isPending ||
    cancel.isPending ||
    resume.isPending ||
    dropChange.isPending ||
    subscribe.isPending;

  const endDate = data.current_period_end
    ? formatDate(data.current_period_end)
    : "the end of this period";

  function choose(option: PlanOption) {
    const price =
      option.price_pence !== null
        ? formatPence(option.price_pence, option.currency)
        : "";
    if (option.action === "subscribe") {
      subscribe.mutate(option.key);
    } else if (option.action === "upgrade") {
      setAsking({
        content: upgradeContent(option, price),
        run: () => changePlan.mutateAsync(option.key),
      });
    } else if (option.action === "downgrade") {
      setAsking({
        content: downgradeContent(data, option, price, endDate),
        run: () => changePlan.mutateAsync(option.key),
      });
    } else if (option.action === "cancel") {
      setAsking({
        content: leaveContent(data, endDate, {
          title: `Are you sure you want to switch to ${option.name}?`,
          intro: `You won't receive future job requests while you're on the ${option.name} plan. `,
          linkLabel: `Switch to ${option.name}`,
          keepLabel: `Keep ${data.plan.name} plan`,
          destination: option.name,
        }),
        run: () => cancel.mutateAsync(undefined),
      });
    }
  }

  function toggleRenewal() {
    if (data.cancel_at_period_end) {
      resume.mutate(undefined);
      return;
    }
    const free = data.options.find((option) => option.action === "cancel");
    setAsking({
      content: leaveContent(data, endDate, {
        title: "Turn off auto-renewal?",
        intro: "",
        linkLabel: "Turn off auto-renewal",
        keepLabel: "Keep auto-renewal on",
        destination: free?.name ?? "the Free plan",
      }),
      run: () => cancel.mutateAsync(undefined),
    });
  }

  return (
    <>
      <PageHeader
        title="Plan & billing"
        description="Your plan, renewal and payment history. Cards are handled securely by Stripe."
      />

      {!data.billing_enabled ? (
        <Notice tone="warning" className="mb-4">
          Online payments aren't switched on yet, so plans can't be changed
          here. Please contact us if you'd like to upgrade.
        </Notice>
      ) : null}
      {data.payment_failed ? (
        <Notice tone="error" className="mb-4">
          <p className="flex items-center gap-2 font-semibold">
            <AlertTriangle aria-hidden className="size-4" />
            Your last payment didn't go through
          </p>
          <p className="mt-1">
            Your paid plan is paused until it's fixed. Update your card and
            Stripe will retry; your plan comes back as soon as it's paid.
          </p>
          <Button
            size="sm"
            className="mt-3"
            loading={portal.isPending}
            onClick={() => portal.mutate()}
          >
            Update payment method
          </Button>
        </Notice>
      ) : null}

      <div className="space-y-6">
        <CurrentPlan
          data={data}
          busy={busy}
          portalLoading={portal.isPending}
          onPortal={() => portal.mutate()}
          onToggleRenewal={toggleRenewal}
          onDropChange={() => dropChange.mutate(undefined)}
        />

        {data.options.length > 0 ? (
          <section aria-labelledby="plans-heading">
            <h2 id="plans-heading" className="mb-3 text-[15px] font-semibold">
              {data.has_subscription ? "Change plan" : "Choose a plan"}
            </h2>
            <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(15rem,1fr))]">
              {data.options.map((option) => (
                <PlanCard
                  key={option.key}
                  option={option}
                  disabled={busy || !data.billing_enabled}
                  loading={
                    (changePlan.isPending &&
                      changePlan.variables === option.key) ||
                    (subscribe.isPending &&
                      subscribe.variables === option.key) ||
                    (cancel.isPending && option.action === "cancel")
                  }
                  scheduledFor={scheduledFor(option, data)}
                  onChoose={() => choose(option)}
                />
              ))}
            </div>
          </section>
        ) : null}

        <Invoices />
        <Activity />
      </div>

      <PlanChangeDialog
        content={asking?.content ?? null}
        onConfirm={() => asking?.run() ?? Promise.resolve()}
        onClose={() => setAsking(null)}
      />
    </>
  );
}

/** When this plan card's change has already been booked, so the button says so. */
function scheduledFor(option: PlanOption, data: BillingSummary): string | null {
  const when = data.current_period_end
    ? formatDate(data.current_period_end)
    : "the end of this period";
  if (option.action === "cancel" && data.cancel_at_period_end) return when;
  if (data.pending_change?.plan.key === option.key) {
    return data.pending_change.effective_at
      ? formatDate(data.pending_change.effective_at)
      : when;
  }
  return null;
}

/** "You can upgrade to Pro or Premium": every paid plan, whichever one they are on now. */
function paidPlanNames(data: BillingSummary): string {
  const names = data.options
    .filter((option) => option.action !== "cancel")
    .map((option) => option.name);
  return names.length > 1
    ? `${names.slice(0, -1).join(", ")} or ${names.at(-1)}`
    : (names[0] ?? "a paid plan");
}

/** Leaving a paid plan for the free one (a cancellation at the end of the period). */
function leaveContent(
  data: BillingSummary,
  endDate: string,
  text: {
    title: string;
    intro: string;
    linkLabel: string;
    keepLabel: string;
    destination: string;
  },
): PlanChangeDialogContent {
  return {
    tone: "warning",
    icon: AlertCircleIcon,
    title: text.title,
    body: `${text.intro}Your current ${data.plan.name} plan will stay active until ${endDate}, then you'll be moved to ${text.destination} and you won't be charged again.`,
    points: [
      { icon: BellOff, text: "You won't receive future job requests." },
      {
        icon: ArrowUp,
        text: `You can upgrade to ${paidPlanNames(data)} at any time.`,
      },
    ],
    primaryLabel: text.keepLabel,
    linkLabel: text.linkLabel,
    confirm: "link",
  };
}

/** Moving to a cheaper paid plan: booked for the end of the period. */
function downgradeContent(
  data: BillingSummary,
  option: PlanOption,
  price: string,
  endDate: string,
): PlanChangeDialogContent {
  return {
    tone: "warning",
    icon: AlertCircleIcon,
    title: `Are you sure you want to switch to ${option.name}?`,
    body: `Your current ${data.plan.name} plan will stay active until ${endDate}, then you'll be moved to ${option.name}${price ? ` (${price}/month)` : ""}. Until then nothing changes.`,
    points: [
      {
        icon: CalendarClock,
        text: `${data.plan.name} benefits end on ${endDate}.`,
      },
      { icon: ArrowUp, text: "You can upgrade again at any time." },
    ],
    primaryLabel: `Keep ${data.plan.name} plan`,
    linkLabel: `Switch to ${option.name}`,
    confirm: "link",
  };
}

/** Moving to a dearer plan: starts now, the card is charged the difference. */
function upgradeContent(
  option: PlanOption,
  price: string,
): PlanChangeDialogContent {
  return {
    tone: "positive",
    icon: ArrowUp,
    title: `Upgrade to ${option.name}?`,
    body: `The ${option.name} plan${price ? ` (${price}/month)` : ""} starts now, and your card is charged the difference for the rest of this billing period.`,
    points: [
      { icon: Zap, text: "Your new features start straight away." },
      {
        icon: CreditCard,
        text: "You only pay the difference for this period.",
      },
    ],
    primaryLabel: `Upgrade to ${option.name}`,
    linkLabel: "Not now",
    confirm: "primary",
  };
}

/** The "!" in the amber circle: shown for anything that takes something away. */
function AlertCircleIcon() {
  return (
    <span aria-hidden className="text-[40px] leading-none font-extrabold">
      !
    </span>
  );
}

function CurrentPlan({
  data,
  busy,
  portalLoading,
  onPortal,
  onToggleRenewal,
  onDropChange,
}: {
  data: BillingSummary;
  busy: boolean;
  portalLoading: boolean;
  onPortal: () => void;
  onToggleRenewal: () => void;
  onDropChange: () => void;
}) {
  const end = data.current_period_end
    ? formatDate(data.current_period_end)
    : null;
  return (
    <Card>
      <CardHeader title="Your plan" />
      <CardBody className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="flex items-center gap-2">
              <span className="text-2xl font-bold text-ink">
                {data.plan.name}
              </span>
              <Badge tone={statusTone[data.plan.key]}>Current plan</Badge>
            </p>
            <p className="mt-1 text-sm">
              {data.price_pence !== null
                ? `${formatPence(data.price_pence, data.currency)} per month`
                : "No charge"}
            </p>
          </div>
          {data.has_billing_account ? (
            <Button
              variant="outline"
              icon={<CreditCard aria-hidden className="size-4" />}
              loading={portalLoading}
              onClick={onPortal}
            >
              Payment method &amp; invoices
            </Button>
          ) : null}
        </div>

        {data.has_subscription ? (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-surface px-4 py-3">
            <div className="min-w-0 text-sm">
              <p className="flex items-center gap-2 font-semibold text-ink">
                <CalendarClock aria-hidden className="size-4 text-primary" />
                {data.cancel_at_period_end
                  ? `Ends on ${end ?? "the end of this period"}`
                  : data.payment_failed
                    ? "Payment overdue"
                    : `Renews automatically on ${end ?? "your next billing date"}`}
              </p>
              <p className="mt-0.5 text-xs">
                {data.cancel_at_period_end
                  ? "You keep your plan until then. Turn auto-renewal back on to carry on."
                  : "You'll be charged each month until you turn auto-renewal off."}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-ink">Auto-renew</span>
              <Toggle
                on={data.auto_renew}
                disabled={busy}
                label="Auto-renew my plan"
                onChange={onToggleRenewal}
              />
            </div>
          </div>
        ) : null}

        {data.pending_change ? (
          <Notice tone="info" className="flex flex-wrap items-center gap-3">
            <span className="min-w-0 flex-1">
              You're moving to the{" "}
              <strong>{data.pending_change.plan.name}</strong> plan
              {data.pending_change.effective_at
                ? ` on ${formatDate(data.pending_change.effective_at)}`
                : " at the end of this period"}
              .
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={onDropChange}
            >
              Keep {data.plan.name}
            </Button>
          </Notice>
        ) : null}
      </CardBody>
    </Card>
  );
}

function PlanCard({
  option,
  disabled,
  loading,
  scheduledFor,
  onChoose,
}: {
  option: PlanOption;
  disabled: boolean;
  loading: boolean;
  /** The date a change to this plan has been booked for, when it has. */
  scheduledFor: string | null;
  onChoose: () => void;
}) {
  const current = option.action === "current";
  const label = {
    current: "Your current plan",
    subscribe: `Choose ${option.name}`,
    upgrade: `Upgrade to ${option.name}`,
    downgrade: `Switch to ${option.name}`,
    cancel: `Switch to ${option.name}`,
  }[option.action];
  return (
    <article
      className={cn(
        "flex flex-col rounded-2xl border bg-white p-5 shadow-soft",
        current ? "border-primary ring-2 ring-primary/15" : "border-line",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-lg font-bold text-ink">{option.name}</h3>
        {option.is_popular ? <Badge tone="green">Most popular</Badge> : null}
      </div>
      <p className="mt-2 text-3xl font-bold text-ink">
        {formatPence(option.price_pence ?? 0, option.currency)}
        <span className="text-sm font-medium text-muted"> /month</span>
      </p>
      {option.tagline ? <p className="mt-1 text-sm">{option.tagline}</p> : null}
      <ul className="mt-4 flex-1 space-y-2 text-sm">
        {option.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2">
            <Check
              aria-hidden
              className="mt-0.5 size-4 shrink-0 text-primary"
            />
            {feature}
          </li>
        ))}
      </ul>
      <Button
        className="mt-5 w-full"
        variant={
          current || scheduledFor || option.action === "cancel"
            ? "outline"
            : "primary"
        }
        disabled={current || !!scheduledFor || disabled}
        loading={loading}
        icon={
          scheduledFor ? <CalendarClock aria-hidden className="size-4" /> : null
        }
        onClick={onChoose}
      >
        {scheduledFor ? `Switching on ${scheduledFor}` : label}
      </Button>
    </article>
  );
}

function Invoices() {
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ["billing", "invoices", page],
    queryFn: () => billingApi.invoices(page),
    placeholderData: keepPreviousData,
  });
  return (
    <Card>
      <CardHeader
        title="Payment history"
        description="Every charge and invoice for your membership."
      />
      {query.isPending ? (
        <PageLoader />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : query.data.items.length === 0 ? (
        <EmptyState
          title="No payments yet"
          text="Invoices appear here after your first payment."
          icon={<FileText aria-hidden className="size-6" strokeWidth={1.75} />}
        />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Date</Th>
              <Th>Description</Th>
              <Th>Amount</Th>
              <Th>Status</Th>
              <Th>
                <span className="sr-only">Invoice</span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {query.data.items.map((invoice) => (
              <Tr key={invoice.id}>
                <Td className="whitespace-nowrap">
                  {formatDate(invoice.paid_at ?? invoice.issued_at)}
                </Td>
                <Td>
                  <p className="font-medium text-ink">
                    {invoice.plan_name
                      ? `${invoice.plan_name} plan`
                      : (invoice.description ?? "Membership")}
                  </p>
                  <p className="text-xs text-subtle">
                    {billingReasonLabels[invoice.billing_reason ?? ""] ??
                      invoice.number ??
                      ""}
                  </p>
                </Td>
                <Td className="whitespace-nowrap font-medium text-ink">
                  {formatPence(
                    invoice.status === "paid"
                      ? invoice.amount_paid_pence
                      : invoice.amount_due_pence,
                    invoice.currency,
                  )}
                </Td>
                <Td>
                  <Badge tone={invoiceStatusTones[invoice.status] ?? "neutral"}>
                    {invoiceStatusLabels[invoice.status] ?? invoice.status}
                  </Badge>
                </Td>
                <Td>
                  <div className="flex justify-end gap-3 text-[13px] font-semibold">
                    {invoice.hosted_invoice_url ? (
                      <a
                        href={invoice.hosted_invoice_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        View
                        <ExternalLink aria-hidden className="size-3.5" />
                      </a>
                    ) : null}
                    {invoice.invoice_pdf_url ? (
                      <a
                        href={invoice.invoice_pdf_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline"
                      >
                        PDF
                      </a>
                    ) : null}
                  </div>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
      {query.data ? (
        <Pagination
          page={page}
          pages={query.data.pages}
          total={query.data.total}
          onChange={setPage}
          noun="invoices"
        />
      ) : null}
    </Card>
  );
}

function Activity() {
  const query = useQuery({
    queryKey: ["billing", "activity"],
    queryFn: billingApi.activity,
  });
  if (!query.data || query.data.length === 0) return null;
  return (
    <Card>
      <CardHeader title="Plan history" />
      <ul className="divide-y divide-line">
        {query.data.map((item) => (
          <li
            key={`${item.created_at}-${item.kind}-${item.message}`}
            className="flex flex-wrap items-baseline justify-between gap-2 px-5 py-3 text-sm"
          >
            <span className="text-ink">{item.message}</span>
            <time
              dateTime={item.created_at}
              title={formatDateTime(item.created_at)}
              className="text-xs text-subtle"
            >
              {timeAgo(item.created_at)}
            </time>
          </li>
        ))}
      </ul>
    </Card>
  );
}
