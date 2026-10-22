import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Lock } from "lucide-react";
import { useParams } from "react-router";
import { UpgradeCard } from "@/components/installer/upgrade-card";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, ErrorState, PageLoader } from "@/components/ui/states";
import { ApiError } from "@/lib/api";
import { installerApi } from "@/lib/endpoints";
import { answer } from "@/lib/labels";
import type { Lead } from "@/lib/types";
import { LeadCard, useLeadQuote } from "./leads";

/**
 * One enquiry: where the "View Enquiry & Respond" button in the email lands.
 *
 * - Paid installers see the whole enquiry and can respond straight away.
 * - Free installers see the headline and are asked to upgrade first.
 * - An enquiry that already has its maximum number of responders says so.
 */
export default function EnquiryPage() {
  const { leadId = "" } = useParams();
  const query = useQuery({
    queryKey: ["installer", "lead", leadId],
    queryFn: () => installerApi.lead(leadId),
    enabled: !!leadId,
  });
  const quote = useLeadQuote();

  const back = (
    <ButtonLink to="/leads" variant="outline">
      <ArrowLeft aria-hidden className="size-4" />
      All leads
    </ButtonLink>
  );

  if (query.isPending) return <PageLoader />;
  if (query.isError) {
    if (query.error instanceof ApiError && query.error.status === 404) {
      return (
        <Card>
          <EmptyState
            title="We couldn't find that enquiry"
            text="It may have been sent to a different account. Sign in with the email address the enquiry was sent to."
            action={back}
          />
        </Card>
      );
    }
    return (
      <ErrorState error={query.error} onRetry={() => void query.refetch()} />
    );
  }

  const lead = query.data;
  return (
    <>
      <PageHeader
        title={`Enquiry from ${lead.quote.first_name}`}
        description="A homeowner near you is looking for an EV charger installation."
        actions={back}
      />
      {lead.access === "upgrade_required" ? <Headline lead={lead} /> : null}
      {lead.access === "upgrade_required" ? (
        <UpgradeCard title="Upgrade to view this enquiry and respond" />
      ) : (
        <div className="max-w-2xl">
          <LeadCard
            lead={lead}
            opening={quote.opening(lead.id)}
            onQuote={() => quote.openQuote(lead)}
          />
          {quote.form}
        </div>
      )}
    </>
  );
}

/** What every installer who was told about the enquiry may see, whatever their plan. */
function Headline({ lead }: { lead: Lead }) {
  const q = lead.quote;
  const rows: [string, string][] = [
    ["Customer", q.first_name],
    ["Location", q.district ?? q.postcode],
    ["Service", "EV charger installation"],
    ["Preferred installation timeframe", answer(q.timing)],
  ];
  return (
    <Card className="mb-6 max-w-2xl p-5">
      <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="text-subtle">{label}</dt>
            <dd className="font-medium text-ink">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 flex items-start gap-2 text-[13px] text-ink">
        <Lock aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
        The customer's answers and contact details are shared with paid members,
        and only the first few installers to respond can quote.
      </p>
    </Card>
  );
}
