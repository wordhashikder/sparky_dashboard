import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  ExternalLink,
  Repeat,
  Search,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState, ErrorState, PageLoader } from "@/components/ui/states";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import {
  billingReasonLabels,
  invoiceStatusLabels,
  invoiceStatusTones,
} from "@/lib/billing";
import { adminApi } from "@/lib/endpoints";
import { formatDate, formatNumber, formatPence } from "@/lib/format";
import { useDebounced } from "@/lib/use-debounced";

/** Payments: subscription headlines and every installer's invoices. */
export default function PaymentsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const q = useDebounced(search);
  const overview = useQuery({
    queryKey: ["admin", "payments", "overview"],
    queryFn: adminApi.paymentsOverview,
    refetchInterval: 60_000,
  });
  const query = useQuery({
    queryKey: ["admin", "payments", { page, q, status }],
    queryFn: () => adminApi.payments(page, { q, status }),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <PageHeader
        title="Payments"
        description="Subscriptions and invoices from Stripe. Refunds and card changes are made in the Stripe dashboard."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Monthly recurring revenue"
          icon={TrendingUp}
          value={
            overview.data
              ? formatPence(
                  overview.data.monthly_recurring_pence,
                  overview.data.currency,
                )
              : "—"
          }
          hint="Active subscriptions at their own prices"
        />
        <StatCard
          label="Active subscriptions"
          icon={Repeat}
          tone="blue"
          value={
            overview.data
              ? formatNumber(overview.data.active_subscriptions)
              : "—"
          }
          hint={
            overview.data && overview.data.cancelling > 0
              ? `${overview.data.cancelling} set to end`
              : "Renewing automatically"
          }
        />
        <StatCard
          label="Collected, last 30 days"
          icon={TrendingUp}
          tone="violet"
          value={
            overview.data
              ? formatPence(
                  overview.data.paid_last_30_days_pence,
                  overview.data.currency,
                )
              : "—"
          }
          hint="Paid invoices"
        />
        <StatCard
          label="Payments overdue"
          icon={XCircle}
          tone={overview.data && overview.data.past_due > 0 ? "coral" : "amber"}
          value={overview.data ? formatNumber(overview.data.past_due) : "—"}
          hint="Dropped to the free plan until paid"
        />
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative w-full max-w-sm">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle"
          />
          <Input
            aria-label="Search payments"
            placeholder="Business or invoice number"
            className="pl-9"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select
          aria-label="Status"
          className="w-44"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
        >
          <option value="">Any status</option>
          {Object.entries(invoiceStatusLabels).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </Select>
      </div>

      <Card>
        {query.isPending ? (
          <PageLoader />
        ) : query.isError ? (
          <ErrorState
            error={query.error}
            onRetry={() => void query.refetch()}
          />
        ) : query.data.items.length === 0 ? (
          <EmptyState
            title="No payments found"
            text="Invoices appear here as installers subscribe."
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Date</Th>
                <Th>Installer</Th>
                <Th>For</Th>
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
                    <Link
                      to={`/installers?open=${invoice.installer_id}`}
                      className="font-semibold text-ink hover:text-primary"
                    >
                      {invoice.business_name}
                    </Link>
                  </Td>
                  <Td>
                    <p>
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
                    <Badge
                      tone={invoiceStatusTones[invoice.status] ?? "neutral"}
                    >
                      {invoiceStatusLabels[invoice.status] ?? invoice.status}
                    </Badge>
                  </Td>
                  <Td>
                    {invoice.hosted_invoice_url ? (
                      <a
                        href={invoice.hosted_invoice_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[13px] font-semibold text-primary hover:underline"
                      >
                        View
                        <ExternalLink aria-hidden className="size-3.5" />
                      </a>
                    ) : null}
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
    </>
  );
}
