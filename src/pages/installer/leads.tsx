import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  Clock,
  FileCheck2,
  Lock,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Star,
  Zap,
} from "lucide-react";
import { type ReactNode, useState } from "react";
import { useNavigate } from "react-router";
import { QuoteForm } from "@/components/conversation/quote-form";
import { UpgradeCard } from "@/components/installer/upgrade-card";
import { Badge, statusTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Notice, Select } from "@/components/ui/form";
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
        <LeadList />
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

/**
 * "Review & Quote": opens (or finds) the conversation for a lead and shows the quote form.
 * Shared by the leads list and the single-enquiry page the email button opens.
 */
export function useLeadQuote(): {
  openQuote: (lead: Lead) => void;
  opening: (leadId: string) => boolean;
  form: ReactNode;
} {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [quoteFor, setQuoteFor] = useState<{
    id: string;
    name: string;
    lead: Lead;
  } | null>(null);
  const start = useMutation({
    mutationFn: installerApi.startConversation,
    onError: (error) => {
      toast.error(
        error instanceof ApiError ? error.message : "Couldn't open the lead.",
      );
      // The enquiry may have filled up, or the plan changed, since the page loaded.
      void queryClient.invalidateQueries({ queryKey: ["installer"] });
    },
  });

  async function open(lead: Lead) {
    const existing = lead.progress?.conversation_id;
    if (existing) {
      setQuoteFor({ id: existing, name: lead.quote.first_name, lead });
      return;
    }
    const conversation = await start.mutateAsync({ lead_id: lead.id });
    setQuoteFor({
      id: conversation.id,
      name: conversation.homeowner_name,
      lead,
    });
  }

  return {
    openQuote: (lead) => void open(lead).catch(() => undefined),
    opening: (leadId) => start.isPending && start.variables?.lead_id === leadId,
    form: quoteFor ? (
      <QuoteForm
        conversationId={quoteFor.id}
        homeownerName={quoteFor.name}
        lead={quoteFor.lead}
        open
        onClose={() => setQuoteFor(null)}
      />
    ) : null,
  };
}

function LeadList() {
  const [page, setPage] = useState(1);
  const quote = useLeadQuote();
  const query = useQuery({
    queryKey: ["installer", "leads", page],
    queryFn: () => installerApi.leads(page),
    placeholderData: keepPreviousData,
  });

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
              opening={quote.opening(lead.id)}
              onQuote={() => quote.openQuote(lead)}
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
      {quote.form}
    </>
  );
}

/**
 * One enquiry. Free installers are told about every enquiry in their area but see only
 * the headline until they upgrade; once an enquiry has its full set of responders,
 * latecomers see that it is full. Only `open` enquiries can be worked.
 */
export function LeadCard({
  lead,
  opening,
  onQuote,
}: {
  lead: Lead;
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
  const open = lead.access === "open";
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
            <h3 className="text-lg font-bold tracking-tight">{q.postcode}</h3>
            {progress?.distance_miles != null ? (
              <Badge tone="blue">{progress.distance_miles} mi away</Badge>
            ) : null}
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
              {q.district ?? "Your service area"} · {q.first_name}
            </span>
            <span className="flex items-center gap-1">
              <Clock aria-hidden className="size-3.5" />
              {timeAgo(lead.created_at)}
            </span>
            <span>{q.reference}</span>
          </p>
        </div>
        {open ? (
          <>
            <label className="sr-only" htmlFor={`status-${lead.id}`}>
              Lead status
            </label>
            <Select
              id={`status-${lead.id}`}
              className="h-8 w-auto text-[13px]"
              value={lead.status}
              disabled={update.isPending}
              onChange={(event) =>
                update.mutate(event.target.value as LeadStatus)
              }
            >
              {lead.status === "sent" ? (
                <option value="sent">New</option>
              ) : null}
              {nextStatuses.map((status) => (
                <option key={status} value={status}>
                  {leadStatusLabels[status]}
                </option>
              ))}
            </Select>
          </>
        ) : null}
      </div>

      <p className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-forest">
        <Zap aria-hidden className="size-3.5" />
        {answer(q.installation_type)}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-3 rounded-xl bg-cream p-3 text-[13px]">
        {open ? (
          <div>
            <p className="text-subtle">Charger location</p>
            <p className="font-medium text-ink">
              {answer(q.charger_location, "ChargerLocation")}
            </p>
          </div>
        ) : (
          <div>
            <p className="text-subtle">Location</p>
            <p className="font-medium text-ink">
              {q.district ?? "Your service area"}
            </p>
          </div>
        )}
        <div>
          <p className="text-subtle">Timing</p>
          <p className="font-medium text-ink">{answer(q.timing)}</p>
        </div>
      </div>

      {progress ? <SlotsBar progress={progress} className="mt-4" /> : null}

      {open ? (
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
      ) : null}

      {!open ? <LockedNotice lead={lead} /> : null}

      {open ? (
        <div className="mt-auto flex flex-wrap gap-2 pt-5">
          <Button
            loading={opening}
            onClick={onQuote}
            icon={<FileCheck2 aria-hidden className="size-4" />}
          >
            {quoted ? "Review & Quote again" : "Review & Quote"}
          </Button>
          {progress?.conversation_id ? (
            <Button
              variant="outline"
              onClick={() => navigate(`/messages/${progress.conversation_id}`)}
              icon={<MessageSquare aria-hidden className="size-4" />}
            >
              Messages
            </Button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

/**
 * What a Free installer, or a latecomer to a full enquiry, sees instead of the details:
 * the way to upgrade, or the news that the enquiry is no longer taking quotes.
 */
function LockedNotice({ lead }: { lead: Lead }) {
  const navigate = useNavigate();
  const slots = lead.progress?.slots_total ?? 5;
  if (lead.access === "full") {
    return (
      <p
        role="status"
        className="mt-auto rounded-xl bg-surface px-4 py-3 text-[13px] text-ink"
      >
        This enquiry has already received the maximum of {slots} installer
        quotes, so it's no longer open to new responses.
      </p>
    );
  }
  return (
    <div className="mt-auto pt-5">
      <p className="flex items-start gap-2 text-[13px] text-ink">
        <Lock aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
        The customer's answers and contact details are shared with paid members.
        Upgrade to view this enquiry and respond.
      </p>
      <Button
        className="mt-3"
        onClick={() => navigate(`/leads/${lead.id}`)}
        icon={<FileCheck2 aria-hidden className="size-4" />}
      >
        View Enquiry &amp; Respond
      </Button>
    </div>
  );
}

/** "2 responded · 3 slots left": how many installers have answered and how many places remain. */
export function SlotsBar({
  progress,
  className,
}: {
  progress: NonNullable<Lead["progress"]>;
  className?: string;
}) {
  const total = Math.max(1, progress.slots_total);
  const used = Math.min(progress.responders, total);
  const left = Math.max(0, total - used);
  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="font-medium text-ink">
          {used} responded · {left} {left === 1 ? "slot" : "slots"} left
        </span>
        <span className="text-subtle">
          {progress.installers_matched} installers notified
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={used}
        aria-label={`${used} of ${total} quote slots taken`}
        className="mt-1.5 flex gap-1"
      >
        {Array.from({ length: total }, (_, index) => (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length decoration
            key={index}
            className={cn(
              "h-1.5 flex-1 rounded-full",
              index < used ? "bg-primary" : "bg-ink/10",
            )}
          />
        ))}
      </div>
    </div>
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
