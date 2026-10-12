import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ExternalLink, Plus } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { Badge, statusTone } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState, ErrorState, PageLoader } from "@/components/ui/states";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { siteLinks } from "@/lib/config";
import { adminApi } from "@/lib/endpoints";
import { formatDate } from "@/lib/format";
import type { BlogPostStatus } from "@/lib/types";

export default function BlogListPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<BlogPostStatus | "">("");
  const query = useQuery({
    queryKey: ["admin", "blog", { page, status }],
    queryFn: () => adminApi.blogPosts(page, status),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <PageHeader
        title="Blog"
        description="Write, schedule and publish the articles on the public blog."
        actions={
          <ButtonLink to="/blog/new">
            <Plus aria-hidden className="size-4" />
            New article
          </ButtonLink>
        }
      />
      <Card>
        <div className="border-b border-line p-4">
          <label htmlFor="blog-status" className="sr-only">
            Status
          </label>
          <Select
            id="blog-status"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as BlogPostStatus | "");
              setPage(1);
            }}
            className="w-auto"
          >
            <option value="">All articles</option>
            <option value="published">Published</option>
            <option value="draft">Drafts</option>
          </Select>
        </div>
        {query.isPending ? (
          <PageLoader />
        ) : query.isError ? (
          <ErrorState
            error={query.error}
            onRetry={() => void query.refetch()}
          />
        ) : query.data.items.length === 0 ? (
          <EmptyState
            title="No articles yet"
            action={<ButtonLink to="/blog/new">Write one</ButtonLink>}
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Title</Th>
                <Th>Category</Th>
                <Th>Status</Th>
                <Th>Published</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {query.data.items.map((post) => {
                const scheduled =
                  post.status === "published" &&
                  post.published_at !== null &&
                  new Date(post.published_at) > new Date();
                return (
                  <Tr key={post.id}>
                    <Td>
                      <Link
                        to={`/blog/${post.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {post.title}
                      </Link>
                      <p className="text-xs">/{post.slug}/</p>
                    </Td>
                    <Td>{post.category}</Td>
                    <Td>
                      <Badge
                        tone={scheduled ? "amber" : statusTone[post.status]}
                      >
                        {scheduled
                          ? "Scheduled"
                          : post.status === "published"
                            ? "Published"
                            : "Draft"}
                      </Badge>
                      {post.is_featured ? (
                        <Badge tone="violet" className="ml-1">
                          Featured
                        </Badge>
                      ) : null}
                    </Td>
                    <Td className="whitespace-nowrap">
                      {formatDate(post.published_at)}
                    </Td>
                    <Td className="text-right">
                      {post.status === "published" && !scheduled ? (
                        <a
                          href={siteLinks.blogPost(post.slug)}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`View ${post.title}`}
                          className="inline-flex text-subtle hover:text-primary"
                        >
                          <ExternalLink aria-hidden className="size-4" />
                        </a>
                      ) : null}
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        )}
        {query.data ? (
          <Pagination
            page={page}
            pages={query.data.pages}
            total={query.data.total}
            onChange={setPage}
            noun="articles"
          />
        ) : null}
      </Card>
    </>
  );
}
