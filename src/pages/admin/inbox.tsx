import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Mail } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState, ErrorState, PageLoader } from "@/components/ui/states";
import { adminApi } from "@/lib/endpoints";
import { formatDateTime } from "@/lib/format";
import { answer } from "@/lib/labels";

export default function InboxPage() {
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ["admin", "contact", page],
    queryFn: () => adminApi.contactMessages(page),
    placeholderData: keepPreviousData,
  });
  return (
    <>
      <PageHeader
        title="Contact inbox"
        description="Messages sent through the website's contact form. Each one was also emailed to the support address; reply from there or with the link below."
      />
      <Card>
        {query.isPending ? (
          <PageLoader />
        ) : query.isError ? (
          <ErrorState
            error={query.error}
            onRetry={() => void query.refetch()}
          />
        ) : query.data.items.length === 0 ? (
          <EmptyState title="No messages yet" />
        ) : (
          <ul className="divide-y divide-line">
            {query.data.items.map((message) => (
              <li key={message.id} className="px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-ink">
                    {message.name}
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge tone="mint">
                      {answer(message.subject, "ContactSubject")}
                    </Badge>
                    <span className="text-xs text-subtle">
                      {formatDateTime(message.created_at)}
                    </span>
                  </div>
                </div>
                <p className="mt-2 text-sm whitespace-pre-line text-ink">
                  {message.message}
                </p>
                <a
                  href={`mailto:${message.email}?subject=${encodeURIComponent("Re: your message to PickASparky")}`}
                  className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-medium text-primary hover:underline"
                >
                  <Mail aria-hidden className="size-4" />
                  Reply to {message.email}
                </a>
              </li>
            ))}
          </ul>
        )}
        {query.data ? (
          <Pagination
            page={page}
            pages={query.data.pages}
            total={query.data.total}
            onChange={setPage}
            noun="messages"
          />
        ) : null}
      </Card>
    </>
  );
}
