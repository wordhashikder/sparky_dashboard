import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  CalendarDays,
  FileCheck2,
  Gauge,
  Inbox,
  Mail,
  Star,
  UserCheck,
  Users,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Breakdown, MonthlyBars } from "@/components/ui/bar-chart";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Select } from "@/components/ui/form";
import { KpiCard, ProgressBar } from "@/components/ui/kpi-card";
import { EmptyState, ErrorState, PageLoader } from "@/components/ui/states";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { can, displayName, greeting } from "@/lib/access";
import { useUser } from "@/lib/auth";
import { siteLinks } from "@/lib/config";
import { adminApi } from "@/lib/endpoints";
import { formatNumber, timeAgo } from "@/lib/format";
import { answer, stageLabels, stageTones } from "@/lib/labels";
import type { AdminOverview, Module } from "@/lib/types";

const periods = [
  { days: 7, label: "Last 7 days" },
  { days: 30, label: "Last 30 days" },
  { days: 90, label: "Last 90 days" },
  { days: 365, label: "Last 12 months" },
];

const today = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Europe/London",
});

export default function OverviewPage() {
  const user = useUser();
  const [days, setDays] = useState(30);
  const query = useQuery({
    queryKey: ["admin", "overview", days],
    queryFn: () => adminApi.overview(days),
    refetchInterval: 120_000,
  });
  const firstName = user.full_name?.split(" ")[0] ?? displayName(user);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="flex items-center gap-1.5 text-[13px] text-subtle">
            <CalendarDays aria-hidden className="size-4" />
            {today.format(new Date())}
          </p>
          <h1 className="mt-1 text-[24px] font-bold tracking-[-0.01em] sm:text-[28px]">
            {greeting()}, {firstName}
          </h1>
          <p className="mt-1 text-sm">Here’s how the marketplace is doing.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="period" className="sr-only">
            Period
          </label>
          <Select
            id="period"
            value={days}
            onChange={(event) => setDays(Number(event.target.value))}
            className="w-auto"
          >
            {periods.map((period) => (
              <option key={period.days} value={period.days}>
                {period.label}
              </option>
            ))}
          </Select>
          <a
            href={siteLinks.home}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-line bg-white px-4 text-sm font-semibold text-ink hover:border-ink/30"
          >
            View website
          </a>
        </div>
      </div>

      {query.isPending ? (
        <PageLoader />
      ) : query.isError ? (
        <Card>
          <ErrorState
            error={query.error}
            onRetry={() => void query.refetch()}
          />
        </Card>
      ) : (
        <OverviewBody
          data={query.data}
          canSee={(module) => can(user, module)}
        />
      )}
    </>
  );
}

function OverviewBody({
  data,
  canSee,
}: {
  data: AdminOverview;
  canSee: (module: Module) => boolean;
}) {
  const attention = [
    {
      count: data.held_leads,
      text: "Requests waiting for you to choose installers",
      to: "/leads?stage=held",
      icon: Zap,
      module: "leads" as Module,
    },
    {
      count: data.unmatched_leads,
      text: "Requests no installer covers",
      to: "/leads?status=unmatched",
      icon: Gauge,
      module: "leads" as Module,
    },
    {
      count: data.installers_pending,
      text: "Installers waiting for approval",
      to: "/installers?status=pending",
      icon: UserCheck,
      module: "installers" as Module,
    },
    {
      count: data.reviews_pending,
      text: "Reviews to moderate",
      to: "/reviews",
      icon: Star,
      module: "reviews" as Module,
    },
    {
      count: data.enquiries_for_team,
      text: "Enquiries for unclaimed listings",
      to: "/leads?tab=enquiries",
      icon: Mail,
      module: "leads" as Module,
    },
    {
      count: data.contact_messages_recent,
      text: "Contact form messages",
      to: "/inbox",
      icon: Inbox,
      module: "inbox" as Module,
    },
  ].filter((item) => canSee(item.module));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total leads"
          kpi={data.leads}
          value={formatNumber(data.leads.value)}
          icon={Zap}
        />
        <KpiCard
          label="Active installers"
          kpi={data.active_installers}
          value={formatNumber(data.active_installers.value)}
          icon={Users}
          tone="blue"
        />
        <KpiCard
          label="Quotes sent"
          kpi={data.quotes_sent}
          value={formatNumber(data.quotes_sent.value)}
          icon={FileCheck2}
          tone="violet"
        />
        <KpiCard
          label="Match rate"
          kpi={data.match_rate}
          value={`${data.match_rate.value}%`}
          icon={Gauge}
          tone="amber"
          points
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader
            title="Leads and quotes"
            description="The last six months"
          />
          <CardBody>
            <MonthlyBars data={data.monthly} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Leads by area" description="This month" />
          <CardBody>
            <Breakdown
              items={data.leads_by_area}
              empty="No leads this month yet."
            />
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card className="overflow-hidden">
          <CardHeader
            title="Recent leads"
            description="The newest quote requests and how far each has got"
            actions={
              canSee("leads") ? (
                <ButtonLink to="/leads" variant="ghost" size="sm">
                  View all <ArrowRight aria-hidden className="size-4" />
                </ButtonLink>
              ) : null
            }
          />
          {data.recent_leads.length === 0 ? (
            <EmptyState
              title="No quote requests yet"
              text="Requests from the website appear here as soon as they arrive."
            />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Homeowner</Th>
                  <Th>Job</Th>
                  <Th>Quotes</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {data.recent_leads.map((lead) => (
                  <Tr key={lead.id}>
                    <Td>
                      {canSee("leads") ? (
                        <Link
                          to={`/leads?open=${lead.id}`}
                          className="font-semibold text-ink hover:text-primary"
                        >
                          {lead.first_name}
                        </Link>
                      ) : (
                        <span className="font-semibold text-ink">
                          {lead.first_name}
                        </span>
                      )}
                      <p className="text-xs text-subtle">
                        {lead.reference} · {timeAgo(lead.created_at)}
                      </p>
                    </Td>
                    <Td>
                      <p className="text-ink">
                        {answer(lead.installation_type)}
                      </p>
                      <p className="text-xs text-subtle">
                        {lead.district ?? lead.postcode}
                      </p>
                    </Td>
                    <Td>
                      <ProgressBar
                        value={lead.quotes_sent}
                        max={Math.max(lead.installers_matched, 1)}
                        label={`${lead.installers_matched} matched`}
                      />
                    </Td>
                    <Td>
                      <Badge tone={stageTones[lead.stage]}>
                        {stageLabels[lead.stage]}
                      </Badge>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Needs attention"
            description={`In the last ${data.period_days} days`}
          />
          <ul className="divide-y divide-line">
            {attention.map((item) => (
              <li key={item.text}>
                <Link
                  to={item.to}
                  className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-surface"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-canvas text-ink">
                    <item.icon aria-hidden className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1 text-sm text-ink">
                    {item.text}
                  </span>
                  <span
                    className={
                      item.count
                        ? "min-w-7 rounded-full bg-primary-soft px-2 text-center text-xs leading-6 font-semibold text-forest"
                        : "min-w-7 rounded-full bg-ink/5 px-2 text-center text-xs leading-6 text-subtle"
                    }
                  >
                    {item.count}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
