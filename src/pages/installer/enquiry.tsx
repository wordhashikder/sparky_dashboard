import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useParams } from "react-router";
import { LockedEnquiry } from "@/components/installer/locked-enquiry";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, ErrorState, PageLoader } from "@/components/ui/states";
import { ApiError } from "@/lib/api";
import { installerApi } from "@/lib/endpoints";
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
      {lead.access === "upgrade_required" ? (
        <LockedEnquiry lead={lead} />
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
