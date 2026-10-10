import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ExternalLink, Search } from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "react-router";
import { JobSummary, Timeline } from "@/components/conversation/thread";
import { Badge, statusTone } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Drawer } from "@/components/ui/drawer";
import { Input, Select } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState, ErrorState, PageLoader } from "@/components/ui/states";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { Tabs } from "@/components/ui/tabs";
import { siteLinks } from "@/lib/config";
import { adminApi } from "@/lib/endpoints";
import { formatDate, formatDateTime, timeAgo } from "@/lib/format";
import {
  answer,
  leadStatusLabels,
  offerStatusLabels,
  quoteStatusLabels,
} from "@/lib/labels";
import type { AdminQuote, QuoteStatus } from "@/lib/types";
import { useDebounced } from "@/lib/use-debounced";

type Tab = "quotes" | "enquiries" | "conversations";
const TABS: Tab[] = ["quotes", "enquiries", "conversations"];

export default function AdminLeadsPage() {
  const [params, setParams] = useSearchParams();
  const requested = params.get("tab") as Tab | null;
  const tab = requested && TABS.includes(requested) ? requested : "quotes";
  return (
    <>
      <PageHeader
        title="Leads & Quotes"
        description="Every quote request and who it went to, direct enquiries from profiles, and the conversations and quotes between installers and homeowners."
      />
      <Tabs
        label="Show"
        value={tab}
        onChange={(value) => setParams({ tab: value })}
        tabs={[
          { value: "quotes", label: "Quote requests" },
          { value: "enquiries", label: "Profile enquiries" },
          { value: "conversations", label: "Conversations & quotes" },
        ]}
      />
      {tab === "quotes" ? (
        <QuoteRequests />
      ) : tab === "enquiries" ? (
        <Enquiries />
      ) : (
        <Conversations />
      )}
    </>
  );
}

function QuoteRequests() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<QuoteStatus | "">("");
  const [open, setOpen] = useState<AdminQuote | null>(null);
  const q = useDebounced(search);
  const query = useQuery({
    queryKey: ["admin", "quotes", { page, q, status }],
    queryFn: () => adminApi.quotes(page, { q, status }),
    placeholderData: keepPreviousData,
  });

  return (
    <Card>
      <div className="flex flex-wrap gap-3 border-b border-line p-4">
        <div className="relative min-w-56 flex-1">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle"
          />
          <label htmlFor="quote-search" className="sr-only">
            Search quote requests
          </label>
          <Input
            id="quote-search"
            type="search"
            placeholder="Reference, postcode, name or email"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
        <label htmlFor="quote-status" className="sr-only">
          Status
        </label>
        <Select
          id="quote-status"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as QuoteStatus | "");
            setPage(1);
          }}
          className="w-auto"
        >
          <option value="">All statuses</option>
          {(Object.keys(quoteStatusLabels) as QuoteStatus[]).map((key) => (
            <option key={key} value={key}>
              {quoteStatusLabels[key]}
            </option>
          ))}
        </Select>
      </div>
      {query.isPending ? (
        <PageLoader />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : query.data.items.length === 0 ? (
        <EmptyState title="No quote requests found" />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Reference</Th>
              <Th>Customer</Th>
              <Th>Area</Th>
              <Th>Job</Th>
              <Th>Status</Th>
              <Th>Received</Th>
            </tr>
          </thead>
          <tbody>
            {query.data.items.map((quote) => (
              <Tr key={quote.id}>
                <Td>
                  <button
                    type="button"
                    className="cursor-pointer font-medium text-primary hover:underline"
                    onClick={() => setOpen(quote)}
                  >
                    {quote.reference}
                  </button>
                </Td>
                <Td>
                  <p className="text-ink">{quote.first_name}</p>
                  <p className="text-xs">{quote.email}</p>
                </Td>
                <Td>
                  {quote.postcode}
                  <p className="text-xs">{quote.district ?? ""}</p>
                </Td>
                <Td>{answer(quote.installation_type)}</Td>
                <Td>
                  <Badge tone={statusTone[quote.status]}>
                    {quoteStatusLabels[quote.status]}
                  </Badge>
                </Td>
                <Td className="whitespace-nowrap">
                  {formatDateTime(quote.created_at)}
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
          noun="requests"
        />
      ) : null}
      <QuoteDrawer quote={open} onClose={() => setOpen(null)} />
    </Card>
  );
}

function QuoteDrawer({
  quote,
  onClose,
}: {
  quote: AdminQuote | null;
  onClose: () => void;
}) {
  const matches = useQuery({
    queryKey: ["admin", "quote-matches", quote?.id],
    queryFn: () => adminApi.quoteMatches(quote?.id ?? ""),
    enabled: !!quote,
  });
  const rows: [string, string][] = quote
    ? [
        [
          "Postcode",
          `${quote.postcode}${quote.district ? ` (${quote.district})` : ""}`,
        ],
        ["Installation", answer(quote.installation_type)],
        ["Charger location", answer(quote.charger_location, "ChargerLocation")],
        ["Existing charger", answer(quote.existing_charger)],
        ["Charger choice", answer(quote.charger_followup)],
        ["Fuse box", answer(quote.fuse_box_distance)],
        [
          "Vehicle",
          quote.vehicle ?? (quote.vehicle_undecided ? "Not chosen yet" : "—"),
        ],
        ["Timing", answer(quote.timing)],
        ["Name", quote.first_name],
        ["Email", quote.email],
        ["Phone", quote.phone ?? "Not given"],
      ]
    : [];
  return (
    <Drawer
      open={!!quote}
      onClose={onClose}
      title={quote ? `Quote request ${quote.reference}` : ""}
      description={quote ? `Received ${formatDateTime(quote.created_at)}` : ""}
    >
      <dl className="grid grid-cols-[150px_1fr] gap-x-4 gap-y-2 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-subtle">{label}</dt>
            <dd className="text-ink">{value}</dd>
          </div>
        ))}
      </dl>
      {quote?.notes ? (
        <p className="mt-4 rounded-lg bg-surface p-3 text-sm whitespace-pre-line text-ink">
          {quote.notes}
        </p>
      ) : null}
      <h3 className="mt-6 mb-2 text-[13px] font-semibold">Sent to</h3>
      {matches.isPending ? (
        <PageLoader />
      ) : matches.data && matches.data.length > 0 ? (
        <ul className="divide-y divide-line rounded-xl border border-line">
          {matches.data.map((match) => (
            <li
              key={match.id}
              className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
            >
              <a
                href={siteLinks.installer(match.installer_slug)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 font-medium text-ink hover:text-primary"
              >
                {match.installer_name}
                <ExternalLink aria-hidden className="size-3.5" />
              </a>
              <Badge tone={statusTone[match.status]}>
                {leadStatusLabels[match.status]}
              </Badge>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm">
          No installer covered this postcode, so the team was alerted.
        </p>
      )}
    </Drawer>
  );
}

function Enquiries() {
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ["admin", "enquiries", page],
    queryFn: () => adminApi.enquiries(page),
    placeholderData: keepPreviousData,
  });
  if (query.isPending) return <PageLoader />;
  if (query.isError)
    return (
      <ErrorState error={query.error} onRetry={() => void query.refetch()} />
    );
  return (
    <Card>
      {query.data.items.length === 0 ? (
        <EmptyState title="No profile enquiries yet" />
      ) : (
        <ul className="divide-y divide-line">
          {query.data.items.map((enquiry) => (
            <li key={enquiry.id} className="px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-ink">
                  {enquiry.name} → {enquiry.installer_name}
                </p>
                <div className="flex items-center gap-2">
                  <Badge tone={enquiry.sent_to_installer ? "green" : "amber"}>
                    {enquiry.sent_to_installer
                      ? "Sent to installer"
                      : "For the team"}
                  </Badge>
                  <span className="text-xs text-subtle">
                    {timeAgo(enquiry.created_at)}
                  </span>
                </div>
              </div>
              <p className="mt-2 text-sm whitespace-pre-line text-ink">
                {enquiry.message}
              </p>
              <p className="mt-2 text-[13px]">
                <a
                  href={`mailto:${enquiry.email}`}
                  className="text-primary hover:underline"
                >
                  {enquiry.email}
                </a>
                {enquiry.phone ? ` · ${enquiry.phone}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
      <Pagination
        page={page}
        pages={query.data.pages}
        total={query.data.total}
        onChange={setPage}
        noun="enquiries"
      />
    </Card>
  );
}

function Conversations() {
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const query = useQuery({
    queryKey: ["admin", "conversations", page],
    queryFn: () => adminApi.conversations(page),
    placeholderData: keepPreviousData,
  });
  const detail = useQuery({
    queryKey: ["admin", "conversation", openId],
    queryFn: () => adminApi.conversation(openId ?? ""),
    enabled: !!openId,
  });
  if (query.isPending) return <PageLoader />;
  if (query.isError)
    return (
      <ErrorState error={query.error} onRetry={() => void query.refetch()} />
    );
  return (
    <Card>
      {query.data.items.length === 0 ? (
        <EmptyState
          title="No conversations yet"
          text="When installers message homeowners or send quotes, the history appears here."
        />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Installer</Th>
              <Th>Homeowner</Th>
              <Th>Job</Th>
              <Th>Quotes</Th>
              <Th>Last activity</Th>
            </tr>
          </thead>
          <tbody>
            {query.data.items.map((item) => (
              <Tr key={item.id}>
                <Td>
                  <button
                    type="button"
                    className="cursor-pointer text-left font-medium text-primary hover:underline"
                    onClick={() => setOpenId(item.id)}
                  >
                    {item.installer_name}
                  </button>
                </Td>
                <Td>
                  {item.homeowner_name}
                  <p className="text-xs">{item.homeowner_email}</p>
                </Td>
                <Td>{item.kind === "lead" ? "Quote request" : "Enquiry"}</Td>
                <Td>
                  {item.latest_offer_status ? (
                    <Badge tone={statusTone[item.latest_offer_status]}>
                      {item.offer_count} ·{" "}
                      {offerStatusLabels[item.latest_offer_status]}
                    </Badge>
                  ) : (
                    "—"
                  )}
                </Td>
                <Td className="whitespace-nowrap">
                  {formatDate(item.last_message_at)}
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
      <Pagination
        page={page}
        pages={query.data.pages}
        total={query.data.total}
        onChange={setPage}
        noun="conversations"
      />
      <Drawer
        open={!!openId}
        onClose={() => setOpenId(null)}
        wide
        title={
          detail.data
            ? `${detail.data.installer_name} ↔ ${detail.data.homeowner_name}`
            : "Conversation"
        }
        description="Read-only history"
      >
        {detail.isPending ? (
          <PageLoader />
        ) : detail.isError ? (
          <ErrorState error={detail.error} />
        ) : (
          <div className="space-y-4">
            <JobSummary detail={detail.data} />
            <Timeline detail={detail.data} />
          </div>
        )}
      </Drawer>
    </Card>
  );
}
