import { useQuery } from "@tanstack/react-query";
import {
  BadgeCheck,
  FileText,
  Inbox,
  MessageSquare,
  PoundSterling,
  Star,
  Users,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { Breakdown, DailyBars } from "@/components/ui/bar-chart";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Select } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { ErrorState, PageLoader } from "@/components/ui/states";
import { adminApi } from "@/lib/endpoints";
import { formatMoney, formatNumber } from "@/lib/format";
import {
  installerStatusLabels,
  offerStatusLabels,
  planLabels,
  quoteStatusLabels,
  sourceLabels,
} from "@/lib/labels";
import type { AdminOverview } from "@/lib/types";

export default function OverviewPage() {
  const [days, setDays] = useState(30);
  const query = useQuery({
    queryKey: ["admin", "overview", days],
    queryFn: () => adminApi.overview(days),
    refetchInterval: 120_000,
  });

  return (
    <>
      <PageHeader
        title="Overview"
        description="How the marketplace is doing: installers, demand and the work waiting for you."
        actions={
          <>
            <label htmlFor="period" className="sr-only">
              Period
            </label>
            <Select
              id="period"
              value={days}
              onChange={(event) => setDays(Number(event.target.value))}
              className="w-auto"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </Select>
          </>
        }
      />
      {query.isPending ? (
        <PageLoader />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        <Body data={query.data} />
      )}
    </>
  );
}

function Body({ data }: { data: AdminOverview }) {
  const accepted =
    data.offers_by_status.find((item) => item.key === "accepted")?.count ?? 0;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Quote requests"
          value={formatNumber(data.quote_requests_recent)}
          hint={`${formatNumber(data.quote_requests_total)} all time`}
          icon={Zap}
        />
        <StatCard
          label="Profile enquiries"
          value={formatNumber(data.enquiries_recent)}
          hint={`${data.enquiries_for_team} handled by the team`}
          icon={MessageSquare}
          tone="blue"
        />
        <StatCard
          label="Installers listed"
          value={formatNumber(data.installers_total)}
          hint={`${data.installers_claimed} with an account`}
          icon={Users}
          tone="violet"
        />
        <StatCard
          label="Accepted quote value"
          value={formatMoney(data.accepted_quote_value)}
          hint={`${accepted} quotes accepted`}
          icon={PoundSterling}
          tone="amber"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader
            title="Quote requests per day"
            description={`Last ${data.period_days} days`}
          />
          <CardBody>
            <DailyBars
              data={data.quote_requests_daily}
              days={data.period_days}
              label="Quote requests"
            />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Needs your attention" />
          <CardBody className="space-y-2">
            <Todo
              to="/admin/installers?status=pending"
              icon={BadgeCheck}
              label="Installers waiting for approval"
              count={data.installers_pending}
            />
            <Todo
              to="/admin/reviews"
              icon={Star}
              label="Reviews to moderate"
              count={data.reviews_pending}
            />
            <Todo
              to="/admin/leads?tab=enquiries"
              icon={MessageSquare}
              label="Enquiries for the team"
              count={data.enquiries_for_team}
            />
            <Todo
              to="/admin/inbox"
              icon={Inbox}
              label={`Contact messages (${data.period_days} days)`}
              count={data.contact_messages_recent}
            />
            <Todo
              to="/admin/blog"
              icon={FileText}
              label="Blog drafts"
              count={data.blog_drafts}
            />
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader
            title="Installers by plan"
            description="Approved listings"
          />
          <CardBody>
            <Breakdown items={data.installers_by_plan} labels={planLabels} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Installers by status" />
          <CardBody>
            <Breakdown
              items={data.installers_by_status}
              labels={installerStatusLabels}
            />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="How they joined" />
          <CardBody>
            <Breakdown
              items={data.installers_by_source}
              labels={sourceLabels}
            />
          </CardBody>
        </Card>
        <Card>
          <CardHeader
            title="Quote requests"
            description="All time, by outcome"
          />
          <CardBody>
            <Breakdown
              items={data.quote_requests_by_status}
              labels={quoteStatusLabels}
            />
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader
            title="Quotes sent by installers"
            description="In-app quotes, by status"
          />
          <CardBody>
            <Breakdown
              items={data.offers_by_status}
              labels={offerStatusLabels}
            />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Content" />
          <CardBody className="grid grid-cols-2 gap-4 text-sm">
            <Metric label="Published articles" value={data.blog_published} />
            <Metric label="Published reviews" value={data.reviews_published} />
            <Metric label="Location pages" value={data.locations_total} />
            <Metric label="Conversations" value={data.conversations_total} />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function Todo({
  to,
  icon: Icon,
  label,
  count,
}: {
  to: string;
  icon: typeof Star;
  label: string;
  count: number;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-surface"
    >
      <Icon
        aria-hidden
        className="size-[18px] text-primary"
        strokeWidth={1.75}
      />
      <span className="flex-1 text-ink">{label}</span>
      <span
        className={
          count
            ? "rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800"
            : "text-xs text-subtle"
        }
      >
        {count}
      </span>
    </Link>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-surface p-4">
      <p className="text-2xl font-bold text-ink">{formatNumber(value)}</p>
      <p className="mt-1 text-xs">{label}</p>
    </div>
  );
}
