import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  FileCheck2,
  Mail,
  MessageSquare,
  Phone,
  Star,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
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
import { answer, leadStatusLabels } from "@/lib/labels";
import type { Enquiry, Lead, LeadStatus } from "@/lib/types";

const nextStatuses: LeadStatus[] = ["viewed", "contacted", "won", "lost"];

export default function LeadsPage() {
  const [tab, setTab] = useState<"leads" | "enquiries">("leads");
  const summary = useQuery({
    queryKey: ["installer", "summary"],
    queryFn: installerApi.summary,
  });
  const s = summary.data;

  return (
    <>
      <PageHeader
        title="New Leads"
        description="Quote requests matched to your service area, and enquiries sent from your profile."
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

  return (
    <Card>
      {items.length === 0 ? (
        <EmptyState
          title="No leads yet"
          text="When a homeowner in your service area asks for quotes, their request appears here and we email you straight away."
        />
      ) : (
        <ul className="divide-y divide-line">
          {items.map((lead) => (
            <LeadItem key={lead.id} lead={lead} canReply={canReply} />
          ))}
        </ul>
      )}
      <Pagination
        page={page}
        pages={pages}
        total={total}
        onChange={setPage}
        noun="leads"
      />
    </Card>
  );
}

function LeadItem({ lead, canReply }: { lead: Lead; canReply: boolean }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const start = useStartConversation();
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
  const answers: [string, string][] = [
    ["Installation", answer(q.installation_type)],
    ["Charger location", answer(q.charger_location, "ChargerLocation")],
    ["Existing charger", answer(q.existing_charger)],
    ["Charger choice", answer(q.charger_followup)],
    ["Fuse box", answer(q.fuse_box_distance)],
    ["Vehicle", q.vehicle ?? (q.vehicle_undecided ? "Not chosen yet" : "—")],
    ["Timing", answer(q.timing)],
  ];

  return (
    <li className="px-5 py-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[15px] font-semibold">
              {q.first_name} · {q.district ?? q.postcode}
            </h3>
            <Badge tone={statusTone[lead.status]}>
              {leadStatusLabels[lead.status]}
            </Badge>
          </div>
          <p className="mt-0.5 text-xs text-subtle">
            {q.reference} · {q.postcode} · received {timeAgo(lead.created_at)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor={`status-${lead.id}`}>
            Lead status
          </label>
          <Select
            id={`status-${lead.id}`}
            className="h-9 w-auto text-[13px]"
            value={lead.status}
            disabled={update.isPending}
            onChange={(event) =>
              update.mutate(event.target.value as LeadStatus)
            }
          >
            {lead.status === "sent" ? <option value="sent">New</option> : null}
            {nextStatuses.map((status) => (
              <option key={status} value={status}>
                {leadStatusLabels[status]}
              </option>
            ))}
          </Select>
          {canReply ? (
            <Button
              size="sm"
              loading={start.isPending}
              onClick={() => start.mutate({ lead_id: lead.id })}
              icon={<MessageSquare aria-hidden className="size-4" />}
            >
              Message &amp; quote
            </Button>
          ) : null}
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-[13px] sm:grid-cols-3 lg:grid-cols-4">
        {answers.map(([label, value]) => (
          <div key={label}>
            <dt className="text-subtle">{label}</dt>
            <dd className="text-ink">{value}</dd>
          </div>
        ))}
      </dl>
      {q.notes ? (
        <p className="mt-3 rounded-lg bg-surface px-3 py-2 text-[13px] whitespace-pre-line text-ink">
          {q.notes}
        </p>
      ) : null}
      {q.email ? (
        <div className="mt-3 flex flex-wrap gap-4 text-[13px]">
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
    </li>
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
