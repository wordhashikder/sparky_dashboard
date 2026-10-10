import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { BadgeCheck, Star } from "lucide-react";
import { useState } from "react";
import { Badge, statusTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState, ErrorState, PageLoader } from "@/components/ui/states";
import { Tabs } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api";
import { adminApi } from "@/lib/endpoints";
import { formatDate } from "@/lib/format";
import { reviewStatusLabels } from "@/lib/labels";
import type { ReviewStatus } from "@/lib/types";

export default function ReviewsPage() {
  const [status, setStatus] = useState<ReviewStatus | "">("pending");
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();
  const toast = useToast();
  const query = useQuery({
    queryKey: ["admin", "reviews", { page, status }],
    queryFn: () => adminApi.reviews(page, status),
    placeholderData: keepPreviousData,
  });
  const moderate = useMutation({
    mutationFn: ({ id, next }: { id: string; next: ReviewStatus }) =>
      adminApi.moderateReview(id, next),
    onSuccess: (review) => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "reviews"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "overview"] });
      toast.success(
        `Review ${reviewStatusLabels[review.status].toLowerCase()}.`,
      );
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : "Couldn't save."),
  });

  return (
    <>
      <PageHeader
        title="Reviews"
        description="Homeowners review installers from the link sent after a job is marked as won. Check each one before it goes live."
      />
      <Tabs
        label="Status"
        value={status || "all"}
        onChange={(value) => {
          setStatus(value === "all" ? "" : (value as ReviewStatus));
          setPage(1);
        }}
        tabs={[
          { value: "pending", label: "To moderate" },
          { value: "published", label: "Published" },
          { value: "rejected", label: "Rejected" },
          { value: "all", label: "All" },
        ]}
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
          <EmptyState
            title={
              status === "pending" ? "Nothing to moderate" : "No reviews here"
            }
          />
        ) : (
          <ul className="divide-y divide-line">
            {query.data.items.map((review) => (
              <li key={review.id} className="px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="flex items-center gap-1 text-star">
                      {Array.from({ length: 5 }, (_, index) => (
                        <Star
                          // biome-ignore lint/suspicious/noArrayIndexKey: fixed five stars
                          key={index}
                          aria-hidden
                          className="size-4"
                          fill={index < review.rating ? "currentColor" : "none"}
                        />
                      ))}
                      <span className="sr-only">{review.rating} out of 5</span>
                    </p>
                    <h3 className="mt-1 text-[15px] font-semibold">
                      {review.title}
                    </h3>
                    <p className="text-xs text-subtle">
                      {review.author_name}
                      {review.author_location
                        ? `, ${review.author_location}`
                        : ""}{" "}
                      · for {review.installer_name} ·{" "}
                      {formatDate(review.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {review.verified ? (
                      <Badge tone="green">
                        <BadgeCheck aria-hidden className="size-3.5" />
                        Verified job
                      </Badge>
                    ) : null}
                    <Badge tone={statusTone[review.status]}>
                      {reviewStatusLabels[review.status]}
                    </Badge>
                  </div>
                </div>
                <p className="mt-2 text-sm whitespace-pre-line text-ink">
                  {review.body}
                </p>
                <div className="mt-3 flex gap-2">
                  {review.status !== "published" ? (
                    <Button
                      size="sm"
                      loading={
                        moderate.isPending &&
                        moderate.variables?.id === review.id &&
                        moderate.variables.next === "published"
                      }
                      onClick={() =>
                        moderate.mutate({ id: review.id, next: "published" })
                      }
                    >
                      Publish
                    </Button>
                  ) : null}
                  {review.status !== "rejected" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      loading={
                        moderate.isPending &&
                        moderate.variables?.id === review.id &&
                        moderate.variables.next === "rejected"
                      }
                      onClick={() =>
                        moderate.mutate({ id: review.id, next: "rejected" })
                      }
                    >
                      {review.status === "published" ? "Unpublish" : "Reject"}
                    </Button>
                  ) : null}
                </div>
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
            noun="reviews"
          />
        ) : null}
      </Card>
    </>
  );
}
