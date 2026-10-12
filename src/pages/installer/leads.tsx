import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  Clock,
  FileCheck2,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Star,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { QuoteForm } from "@/components/conversation/quote-form";
import { UpgradeCard } from "@/components/installer/upgrade-card";
import { Badge, statusTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Notice, Select } from "@/components/ui/form";
import { ProgressBar } from "@/components/ui/kpi-card";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState, ErrorState, PageLoader } from "@/components/ui/states";
import { Tabs } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api";
import { installerApi } from "@/lib/endpoints";
import { formatDate, timeAgo } from "@/lib/format";
import { answer, leadStatusLabels, offerStatusLabels } from "@/lib/labels";
import { useInstallerSummary } from "@/lib/queries";
import type { Enquiry, Lead, LeadStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const nextStatuses: LeadStatus[] = ["viewed", "contacted", "won", "lost"];

export default function LeadsPage() {
  const [tab, setTab] = useState<"leads" | "enquiries">("leads");
  const summary = useInstallerSummary();
  const s = summary.data;

  return (
    <>
      <PageHeader
        title="New Leads"
        description="Quote requests matched to your service area, and enquiries sent from your profile. Reply fast: homeowners usually choose from the first quotes they get."
      />
      {s ? (
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="New leads"
            value={s.new_leads}
            hint={`${s.leads_total} in total`}
            icon={Zap}
          />
          <StatCard
            label="Unread messages"
            value={s.unread_conversations}
            icon={MessageSquare}
            tone="blue"
          />
          <StatCard
            label="Quotes awaiting answer"
            value={s.open_quotes}
            hint={`${s.accepted_quotes} accepted`}
            icon={FileCheck2}
            tone="violet"
          />
          <StatCard
            label="Rating"
            value={s.rating_avg ? s.rating_avg.toFixed(1) : "—"}
            hint={`${s.review_count} reviews`}
            icon={Star}
            tone="amber"
          />
        </div>
      ) : null}
      {s && !s.receives_leads ? (
        <div className="mb-6">
          <UpgradeCard />
        </div>
      ) : null}
      {s && s.status !== "approved" ? (
        <Notice tone="warning" className="mb-6">
          Your listing is{" "}
          {s.status === "pending" ? "waiting for approval" : s.status}. It isn't
          shown to homeowners until it's approved.
        </Notice>
      ) : null}

      <Tabs
        label="Lead type"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "leads", label: "Matched leads", count: s?.leads_total },
          {
            value: "enquiries",
            label: "Direct enquiries",
            count: s?.enquiries_total,
          },
        ]}
      />
      {tab === "leads" ? (
        <LeadList canReply={!!s?.receives_leads} />
      ) : (
        <EnquiryList canReply={!!s?.receives_leads} />
      )}
    </>
  );
}

function useStartConversation() {
  const navigate = useNavigate();
  const toast = useToast();
  return useMutation({
    mutationFn: installerApi.startConversation,
    onSuccess: (conversation) => navigate(`/messages/${conversation.id}`),
    onError: (error) =>
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Couldn't open the conversation.",
      ),
  });
}

function LeadList({ canReply }: { canReply: boolean }) {
  const [page, setPage] = useState(1);
  const toast = useToast();
  const [quoteFor, setQuoteFor] = useState<{ id: string; name: string } | null>(
    null,
  );
  const query = useQuery({
    queryKey: ["installer", "leads", page],
    queryFn: () => installerApi.leads(page),
    placeholderData: keepPreviousData,
  });
  const start = useMutation({
    mutationFn: installerApi.startConversation,
    onError: (error) =>
      toast.error(
        error instanceof ApiError ? error.message : "Couldn't open the lead.",
      ),
  });

  async function openQuote(lead: Lead) {
    const existing = lead.progress?.conversation_id;
    if (existing) {
      setQuoteFor({ id: existing, name: lead.quote.first_name });
      return;
    }
    const conversation = await start.mutateAsync({ lead_id: lead.id });
    setQuoteFor({ id: conversation.id, name: conversation.homeowner_name });
  }

  if (query.isPending) return <PageLoader />;
  if (query.isError)
    return (
      <ErrorState error={query.error} onRetry={() => void query.refetch()} />
    );
  const { items, total, pages } = query.data;

  if (items.length === 0)
    return (
      <Card>
        <EmptyState
          title="No leads yet"
          text="When a homeowner in your service area asks for quotes, their request appears here and we email you straight away."
        />
      </Card>
    );

  return (
    <>
      <ul className="grid gap-4 xl:grid-cols-2">
        {items.map((lead) => (
          <li key={lead.id}>
            <LeadCard
              lead={lead}
              canReply={canReply}
              opening={start.isPending && start.variables?.lead_id === lead.id}
              onQuote={() => void openQuote(lead).catch(() => undefined)}
            />
          </li>
        ))}
      </ul>
      <Card className="mt-4">
        <Pagination
          page={page}
          pages={pages}
          total={total}
          onChange={setPage}
          noun="leads"
        />
      </Card>
      {quoteFor ? (
        <QuoteForm
          conversationId={quoteFor.id}
          homeownerName={quoteFor.name}
          open
          onClose={() => setQuoteFor(null)}
        />
      ) : null}
    </>
  );
}

function LeadCard({
  lead,
  canReply,
  opening,
  onQuote,
}: {
  lead: Lead;
  canReply: boolean;
  opening: boolean;
  onQuote: () => void;
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const navigate = useNavigate();
  const update = useMutation({
    mutationFn: (status: LeadStatus) =>
      installerApi.updateLead(lead.id, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["installer"] });
      toast.success("Lead updated.");
    },
    onError: (error) =>
      toast.error(
        error instanceof ApiError ? error.message : "Couldn't update the lead.",
      ),
  });
  const q = lead.quote;
  const progress = lead.progress;
  const quoted = progress?.my_quote_status;
  const answers: [string, string][] = [
    ["Charger location", answer(q.charger_location, "ChargerLocation")],
    ["Existing charger", answer(q.existing_charger)],
    ["Charger choice", answer(q.charger_followup)],
    ["Fuse box", answer(q.fuse_box_distance)],
    ["Vehicle", q.vehicle ?? (q.vehicle_undecided ? "Not chosen yet" : "—")],
  ];

  return (
    <article
      className={cn(
        "flex h-full flex-col rounded-2xl border bg-white p-5 shadow-soft",
        lead.status === "sent" ? "border-primary/40" : "border-line",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold">{q.first_name}</h3>
            <Badge tone={statusTone[lead.status]}>
              {leadStatusLabels[lead.status]}
            </Badge>
            {quoted ? (
              <Badge tone={statusTone[quoted]}>
                Your quote: {offerStatusLabels[quoted].toLowerCase()}
              </Badge>
            ) : null}
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-subtle">
            <span className="flex items-center gap-1">
              <MapPin aria-hidden className="size-3.5" />
              {q.district ?? q.postcode}
              {progress?.distance_miles != null
                ? ` · ${progress.distance_miles} mi away`
                : ""}
            </span>
            <span className="flex items-center gap-1">
              <Clock aria-hidden className="size-3.5" />
              {timeAgo(lead.created_at)}
            </span>
            <span>{q.reference}</span>
          </p>
        </div>
        <label className="sr-only" htmlFor={`status-${lead.id}`}>
          Lead status
        </label>
        <Select
          id={`status-${lead.id}`}
          className="h-8 w-auto text-[13px]"
          value={lead.status}
          disabled={update.isPending}
          onChange={(event) => update.mutate(event.target.value as LeadStatus)}
        >
          {lead.status === "sent" ? <option value="sent">New</option> : null}
          {nextStatuses.map((status) => (
            <option key={status} value={status}>
              {leadStatusLabels[status]}
            </option>
          ))}
        </Select>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-cream p-3 text-[13px]">
        <div>
          <p className="text-subtle">Job</p>
          <p className="font-medium text-ink">{answer(q.installation_type)}</p>
        </div>
        <div>
          <p className="text-subtle">Timing</p>
          <p className="font-medium text-ink">{answer(q.timing)}</p>
        </div>
      </div>

      {progress ? (
        <ProgressBar
          className="mt-4"
          value={progress.quotes_sent}
          max={progress.installers_matched}
          label="installers have quoted"
        />
      ) : null}

      <details className="group mt-4 text-[13px]">
        <summary className="cursor-pointer list-none font-medium text-primary [&::-webkit-details-marker]:hidden">
          <span className="group-open:hidden">Show all details</span>
          <span className="hidden group-open:inline">Hide details</span>
        </summary>
        <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2">
          {answers.map(([label, value]) => (
            <div key={label}>
              <dt className="text-subtle">{label}</dt>
              <dd className="text-ink">{value}</dd>
            </div>
          ))}
        </dl>
        {q.notes ? (
          <p className="mt-3 rounded-lg bg-surface px-3 py-2 whitespace-pre-line text-ink">
            {q.notes}
          </p>
        ) : null}
        {q.email ? (
          <div className="mt-3 flex flex-wrap gap-4">
            <a
              href={`mailto:${q.email}`}
              className="flex items-center gap-1.5 text-primary hover:underline"
            >
              <Mail aria-hidden className="size-4" />
              {q.email}
            </a>
            {q.phone ? (
              <a
                href={`tel:${q.phone.replace(/\s+/g, "")}`}
                className="flex items-center gap-1.5 text-primary hover:underline"
              >
                <Phone aria-hidden className="size-4" />
                {q.phone}
              </a>
            ) : null}
          </div>
        ) : (
          <p className="mt-3 text-xs text-subtle">
            Contact details are shared on the Pro and Premium plans.
          </p>
        )}
      </details>

      {canReply ? (
        <div className="mt-auto flex flex-wrap gap-2 pt-5">
          <Button
            loading={opening}
            onClick={onQuote}
            icon={<FileCheck2 aria-hidden className="size-4" />}
          >
            {quoted ? "Send another quote" : "Submit quote"}
          </Button>
          {progress?.conversation_id ? (
            <Button
              variant="outline"
              onClick={() => navigate(`/messages/${progress.conversation_id}`)}
              icon={<MessageSquare aria-hidden className="size-4" />}
            >
              Open conversation
            </Button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function EnquiryList({ canReply }: { canReply: boolean }) {
  const [page, setPage] = useState(1);
  const start = useStartConversation();
  const query = useQuery({
    queryKey: ["installer", "enquiries", page],
    queryFn: () => installerApi.enquiries(page),
    placeholderData: keepPreviousData,
  });

  if (query.isPending) return <PageLoader />;
  if (query.isError)
    return (
      <ErrorState error={query.error} onRetry={() => void query.refetch()} />
    );
  const { items, total, pages } = query.data;

  return (
    <Card>
      {items.length === 0 ? (
        <EmptyState
          title="No direct enquiries yet"
          text={
            canReply
              ? "Homeowners can request a quote straight from your public profile. Their messages appear here."
              : "On the Free plan, requests from your profile go to the PickASparky team. Upgrade to receive them yourself."
          }
        />
      ) : (
        <ul className="divide-y divide-line">
          {items.map((enquiry: Enquiry) => (
            <li key={enquiry.id} className="px-5 py-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-[15px] font-semibold">{enquiry.name}</h3>
                  <p className="mt-0.5 text-xs text-subtle">
                    Sent {formatDate(enquiry.created_at)}
                  </p>
                </div>
                {canReply ? (
                  <Button
                    size="sm"
                    loading={
                      start.isPending &&
                      start.variables?.enquiry_id === enquiry.id
                    }
                    onClick={() => start.mutate({ enquiry_id: enquiry.id })}
                    icon={<MessageSquare aria-hidden className="size-4" />}
                  >
                    Message &amp; quote
                  </Button>
                ) : null}
              </div>
              <p className="mt-3 text-sm whitespace-pre-line text-ink">
                {enquiry.message}
              </p>
              <div className="mt-3 flex flex-wrap gap-4 text-[13px]">
                <a
                  href={`mailto:${enquiry.email}`}
                  className="flex items-center gap-1.5 text-primary hover:underline"
                >
                  <Mail aria-hidden className="size-4" />
                  {enquiry.email}
                </a>
                {enquiry.phone ? (
                  <a
                    href={`tel:${enquiry.phone.replace(/\s+/g, "")}`}
                    className="flex items-center gap-1.5 text-primary hover:underline"
                  >
                    <Phone aria-hidden className="size-4" />
                    {enquiry.phone}
                  </a>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
      <Pagination
        page={page}
        pages={pages}
        total={total}
        onChange={setPage}
        noun="enquiries"
      />
    </Card>
  );
}
