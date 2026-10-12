import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  CheckCircle2,
  ExternalLink,
  MapPin,
  MessageSquare,
  Search,
  Send,
  Star,
} from "lucide-react";
import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Badge, statusTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Drawer } from "@/components/ui/drawer";
import { Input, Notice, Select } from "@/components/ui/form";
import { ProgressBar } from "@/components/ui/kpi-card";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState, ErrorState, PageLoader } from "@/components/ui/states";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { Tabs } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { can } from "@/lib/access";
import { ApiError } from "@/lib/api";
import { useUser } from "@/lib/auth";
import { siteLinks } from "@/lib/config";
import { adminApi } from "@/lib/endpoints";
import { formatDateTime, timeAgo } from "@/lib/format";
import {
  answer,
  leadStatusLabels,
  planLabels,
  quoteStatusLabels,
  stageLabels,
  stageTones,
} from "@/lib/labels";
import type { AdminQuote, LeadStage, QuoteStatus } from "@/lib/types";
import { useDebounced } from "@/lib/use-debounced";
import { cn } from "@/lib/utils";

type Tab = "quotes" | "enquiries";
type Chip = "all" | "held" | LeadStage;
const CHIPS: Chip[] = ["all", "held", "open", "awaiting", "closed"];

const chipLabels: Record<Chip, string> = {
  all: "All",
  held: "Waiting for you",
  open: stageLabels.open,
  awaiting: stageLabels.awaiting,
  closed: stageLabels.closed,
};

export default function AdminLeadsPage() {
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get("tab") === "enquiries" ? "enquiries" : "quotes";
  return (
    <>
      <PageHeader
        title="Leads & Quotes"
        description="Every quote request, who it went to and how far it has got. Send held requests to the installers you choose."
      />
      <Tabs
        label="Show"
        value={tab}
        onChange={(value) =>
          setParams(value === "quotes" ? {} : { tab: value })
        }
        tabs={[
          { value: "quotes", label: "Quote requests" },
          { value: "enquiries", label: "Profile enquiries" },
        ]}
      />
      {tab === "quotes" ? <QuoteRequests /> : <Enquiries />}
    </>
  );
}

function QuoteRequests() {
  const [params, setParams] = useSearchParams();
  const requested = params.get("stage") as Chip | null;
  const chip: Chip = requested && CHIPS.includes(requested) ? requested : "all";
  const statusParam = params.get("status") as QuoteStatus | null;
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<QuoteStatus | "">(
    statusParam && statusParam in quoteStatusLabels ? statusParam : "",
  );
  const openId = params.get("open");
  const q = useDebounced(search);

  const filters = {
    q,
    status: chip === "held" ? ("new" as const) : status,
    stage: chip === "all" || chip === "held" ? ("" as const) : chip,
  };
  const query = useQuery({
    queryKey: ["admin", "quotes", { page, ...filters }],
    queryFn: () => adminApi.quotes(page, filters),
    placeholderData: keepPreviousData,
  });
  const stages = useQuery({
    queryKey: ["admin", "quote-stages"],
    queryFn: adminApi.quoteStages,
  });

  function setChip(next: Chip) {
    const copy = new URLSearchParams(params);
    if (next === "all") copy.delete("stage");
    else copy.set("stage", next);
    copy.delete("status");
    setParams(copy);
    setPage(1);
  }

  function setOpen(id: string | null) {
    const copy = new URLSearchParams(params);
    if (id) copy.set("open", id);
    else copy.delete("open");
    setParams(copy, { replace: true });
  }

  return (
    <>
      <div
        role="tablist"
        aria-label="Stage"
        className="mb-4 flex flex-wrap gap-2"
      >
        {CHIPS.map((value) => {
          const count = stages.data?.[value];
          const active = value === chip;
          return (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setChip(value)}
              className={cn(
                "inline-flex cursor-pointer items-center gap-2 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors",
                active
                  ? "border-ink bg-ink text-white"
                  : "border-line bg-white text-ink hover:border-ink/30",
                value === "held" && !active && count
                  ? "border-amber-300 bg-amber-50"
                  : "",
              )}
            >
              {chipLabels[value]}
              {count !== undefined ? (
                <span
                  className={cn(
                    "rounded-full px-1.5 text-xs",
                    active ? "bg-white/20" : "bg-ink/5",
                  )}
                >
                  {count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
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
              placeholder="Reference, postcode, area, name or email"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>
          {chip !== "held" ? (
            <>
              <label htmlFor="quote-status" className="sr-only">
                Matching
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
                <option value="">Any matching</option>
                {(Object.keys(quoteStatusLabels) as QuoteStatus[]).map(
                  (key) => (
                    <option key={key} value={key}>
                      {quoteStatusLabels[key]}
                    </option>
                  ),
                )}
              </Select>
            </>
          ) : null}
        </div>
        {chip === "held" ? (
          <Notice tone="warning" className="m-4">
            Automatic matching is off (Settings), so these requests wait for
            you. Open one and choose its installers.
          </Notice>
        ) : null}
        {query.isPending ? (
          <PageLoader />
        ) : query.isError ? (
          <ErrorState
            error={query.error}
            onRetry={() => void query.refetch()}
          />
        ) : query.data.items.length === 0 ? (
          <EmptyState title="No quote requests found" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Homeowner</Th>
                <Th>Job</Th>
                <Th>Quotes received</Th>
                <Th>Stage</Th>
                <Th>Received</Th>
              </tr>
            </thead>
            <tbody>
              {query.data.items.map((quote) => (
                <Tr key={quote.id}>
                  <Td>
                    <button
                      type="button"
                      className="cursor-pointer text-left font-semibold text-ink hover:text-primary"
                      onClick={() => setOpen(quote.id)}
                    >
                      {quote.first_name}
                    </button>
                    <p className="text-xs text-subtle">{quote.reference}</p>
                  </Td>
                  <Td>
                    <p className="text-ink">
                      {answer(quote.installation_type)}
                    </p>
                    <p className="text-xs text-subtle">
                      {quote.postcode}
                      {quote.district ? ` · ${quote.district}` : ""}
                    </p>
                  </Td>
                  <Td>
                    {quote.status === "matched" ? (
                      <ProgressBar
                        value={quote.quotes_sent}
                        max={quote.installers_matched}
                        label="installers"
                      />
                    ) : (
                      <Badge tone={statusTone[quote.status]}>
                        {quote.status === "new"
                          ? "Waiting for you"
                          : quoteStatusLabels[quote.status]}
                      </Badge>
                    )}
                  </Td>
                  <Td>
                    <Badge tone={stageTones[quote.stage]}>
                      {stageLabels[quote.stage]}
                    </Badge>
                  </Td>
                  <Td className="whitespace-nowrap">
                    {timeAgo(quote.created_at)}
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
      </Card>
      <QuoteDrawer id={openId} onClose={() => setOpen(null)} />
    </>
  );
}

function QuoteDrawer({
  id,
  onClose,
}: {
  id: string | null;
  onClose: () => void;
}) {
  const user = useUser();
  const quote = useQuery({
    queryKey: ["admin", "quote", id],
    queryFn: () => adminApi.quote(id ?? ""),
    enabled: !!id,
  });
  const matches = useQuery({
    queryKey: ["admin", "quote-matches", id],
    queryFn: () => adminApi.quoteMatches(id ?? ""),
    enabled: !!id,
  });
  const data = quote.data;
  const rows: [string, string][] = data
    ? [
        [
          "Postcode",
          `${data.postcode}${data.district ? ` (${data.district})` : ""}`,
        ],
        ["Installation", answer(data.installation_type)],
        ["Charger location", answer(data.charger_location, "ChargerLocation")],
        ["Existing charger", answer(data.existing_charger)],
        ["Charger choice", answer(data.charger_followup)],
        ["Fuse box", answer(data.fuse_box_distance)],
        [
          "Vehicle",
          data.vehicle ?? (data.vehicle_undecided ? "Not chosen yet" : "—"),
        ],
        ["Timing", answer(data.timing)],
        ["Name", data.first_name],
        ["Email", data.email],
        ["Phone", data.phone ?? "Not given"],
      ]
    : [];

  return (
    <Drawer
      open={!!id}
      onClose={onClose}
      wide
      title={data ? `Quote request ${data.reference}` : "Quote request"}
      description={data ? `Received ${formatDateTime(data.created_at)}` : ""}
    >
      {quote.isPending ? (
        <PageLoader />
      ) : quote.isError ? (
        <ErrorState error={quote.error} />
      ) : data ? (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone={stageTones[data.stage]}>
              {stageLabels[data.stage]}
            </Badge>
            {data.status === "matched" ? (
              <ProgressBar
                value={data.quotes_sent}
                max={data.installers_matched}
                label="installers have quoted"
                className="min-w-60"
              />
            ) : (
              <Badge tone={statusTone[data.status]}>
                {data.status === "new"
                  ? "Waiting for you to choose installers"
                  : quoteStatusLabels[data.status]}
              </Badge>
            )}
          </div>
          <dl className="grid grid-cols-[150px_1fr] gap-x-4 gap-y-2 text-sm">
            {rows.map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-subtle">{label}</dt>
                <dd className="text-ink">{value}</dd>
              </div>
            ))}
          </dl>
          {data.notes ? (
            <p className="rounded-lg bg-surface p-3 text-sm whitespace-pre-line text-ink">
              {data.notes}
            </p>
          ) : null}

          <section>
            <h3 className="mb-2 text-[13px] font-semibold text-ink">Sent to</h3>
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
                    <div className="flex items-center gap-2">
                      <Badge tone={statusTone[match.status]}>
                        {leadStatusLabels[match.status]}
                      </Badge>
                      {can(user, "messages") ? (
                        <Link
                          to={`/messages?installer=${match.installer_id}&q=${encodeURIComponent(data.first_name)}`}
                          className="text-primary hover:text-primary-dark"
                          aria-label={`Messages with ${match.installer_name}`}
                          title="Messages"
                        >
                          <MessageSquare aria-hidden className="size-4" />
                        </Link>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm">
                {data.status === "new"
                  ? "Not sent to anyone yet."
                  : "No installer covered this postcode, so the team was alerted."}
              </p>
            )}
          </section>

          {data.stage === "closed" ? null : data.installers_matched >=
            data.max_installers ? (
            <Notice tone="info">
              This request has reached its {data.max_installers} installers
              (Settings › Lead matching).
            </Notice>
          ) : (
            <AssignInstallers quote={data} />
          )}
        </div>
      ) : null}
    </Drawer>
  );
}

/** Choose installers for a held or unmatched request, or add one more. */
function AssignInstallers({ quote }: { quote: AdminQuote }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [chosen, setChosen] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const candidates = useQuery({
    queryKey: ["admin", "quote-candidates", quote.id],
    queryFn: () => adminApi.quoteCandidates(quote.id),
  });
  const assign = useMutation({
    mutationFn: () => adminApi.assignQuote(quote.id, chosen),
    onSuccess: () => {
      toast.success(
        `Request sent to ${chosen.length} installer${chosen.length === 1 ? "" : "s"}. ${quote.first_name} has been emailed.`,
      );
      setChosen([]);
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (caught) =>
      setError(
        caught instanceof ApiError
          ? (Object.values(caught.fields ?? {})[0] ?? caught.message)
          : "Couldn't send the request.",
      ),
  });

  const toggle = (id: string) =>
    setChosen((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );

  return (
    <section className="rounded-xl border border-line">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div>
          <h3 className="text-[13px] font-semibold text-ink">
            {quote.status === "matched"
              ? "Send to more installers"
              : "Choose installers"}
          </h3>
          <p className="text-xs text-subtle">
            Installers who cover the address come first. They get the usual
            new-lead email.
          </p>
        </div>
        <Button
          size="sm"
          disabled={chosen.length === 0}
          loading={assign.isPending}
          onClick={() => assign.mutate()}
          icon={<Send aria-hidden className="size-4" />}
        >
          Send to {chosen.length || ""} installer
          {chosen.length === 1 ? "" : "s"}
        </Button>
      </header>
      {error ? (
        <Notice tone="error" className="m-3">
          {error}
        </Notice>
      ) : null}
      {candidates.isPending ? (
        <PageLoader />
      ) : candidates.isError ? (
        <ErrorState error={candidates.error} />
      ) : candidates.data.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm">
          No installers on a plan that receives leads yet.
        </p>
      ) : (
        <ul className="max-h-[360px] divide-y divide-line overflow-y-auto">
          {candidates.data.map((candidate) => (
            <li key={candidate.id}>
              <label
                className={cn(
                  "flex items-center gap-3 px-4 py-3",
                  candidate.already_matched
                    ? "cursor-default opacity-60"
                    : "cursor-pointer hover:bg-surface",
                )}
              >
                <input
                  type="checkbox"
                  className="size-4 accent-primary"
                  disabled={candidate.already_matched}
                  checked={
                    candidate.already_matched || chosen.includes(candidate.id)
                  }
                  onChange={() => toggle(candidate.id)}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2 text-sm font-medium text-ink">
                    {candidate.business_name}
                    {candidate.already_matched ? (
                      <Badge tone="green">
                        <CheckCircle2 aria-hidden className="size-3" /> Has it
                      </Badge>
                    ) : null}
                    {candidate.covers_address ? (
                      <Badge tone="mint">Covers the address</Badge>
                    ) : null}
                  </span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-subtle">
                    <span className="flex items-center gap-1">
                      <MapPin aria-hidden className="size-3" />
                      {candidate.town}
                      {candidate.distance_miles !== null
                        ? ` · ${candidate.distance_miles} mi`
                        : ""}
                    </span>
                    <span>{planLabels[candidate.plan]}</span>
                    {candidate.rating_avg !== null ? (
                      <span className="flex items-center gap-1">
                        <Star
                          aria-hidden
                          className="size-3 fill-star text-star"
                        />
                        {candidate.rating_avg.toFixed(1)} (
                        {candidate.review_count})
                      </span>
                    ) : null}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </section>
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
