import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  ChevronRight,
  ExternalLink,
  FileText,
  Globe,
  LayoutTemplate,
  Scale,
} from "lucide-react";
import { Link } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorState, PageLoader } from "@/components/ui/states";
import { siteLinks } from "@/lib/config";
import { adminApi } from "@/lib/endpoints";
import { timeAgo } from "@/lib/format";
import type { ContentSummary } from "@/lib/types";

const groupIcons: Record<string, typeof Globe> = {
  "Site-wide": Globe,
  Pages: FileText,
  Templates: LayoutTemplate,
  Guides: BookOpen,
  Legal: Scale,
};

const groupHelp: Record<string, string> = {
  "Site-wide":
    "Shown on every page: header button, footer, directory headings and reviews.",
  Pages: "Each public page's sections and its search title and description.",
  Templates:
    "Shared wording for every town page; each town can override its heading and text in SEO & Locations.",
  Guides: "The homeowner guides.",
  Legal: "Policies, section by section.",
};

/** Every editable page, grouped as on the website. */
export default function ContentListPage() {
  const query = useQuery({
    queryKey: ["admin", "content"],
    queryFn: adminApi.contentPages,
  });

  const groups = new Map<string, ContentSummary[]>();
  for (const page of query.data ?? []) {
    groups.set(page.group, [...(groups.get(page.group) ?? []), page]);
  }

  return (
    <>
      <PageHeader
        title="Website content"
        description="Edit every section of the public pages, with their SEO titles and descriptions. Changes go live within seconds, and every version is kept so you can restore it."
      />
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
        <div className="space-y-6">
          {[...groups.entries()].map(([group, pages]) => {
            const Icon = groupIcons[group] ?? FileText;
            return (
              <section key={group} aria-labelledby={`group-${group}`}>
                <div className="mb-3 flex items-center gap-2.5">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-primary-soft text-primary">
                    <Icon aria-hidden className="size-4" />
                  </span>
                  <div>
                    <h2
                      id={`group-${group}`}
                      className="text-[15px] font-semibold"
                    >
                      {group}
                    </h2>
                    {groupHelp[group] ? (
                      <p className="text-xs text-subtle">{groupHelp[group]}</p>
                    ) : null}
                  </div>
                </div>
                <Card className="overflow-hidden">
                  <ul className="divide-y divide-line">
                    {pages.map((page) => (
                      <li
                        key={page.key}
                        className="flex items-center gap-2 pr-3"
                      >
                        <Link
                          to={`/content/${page.key}`}
                          className="flex min-w-0 flex-1 items-center gap-4 px-5 py-4 transition-colors hover:bg-surface"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">
                              {page.label}
                              {page.customised ? (
                                <Badge tone="green">Edited</Badge>
                              ) : (
                                <Badge>Original</Badge>
                              )}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-subtle">
                              {page.description}
                            </p>
                          </div>
                          <span className="hidden shrink-0 text-right text-xs text-subtle sm:block">
                            {page.updated_at ? (
                              <>
                                Updated {timeAgo(page.updated_at)}
                                {page.updated_by ? (
                                  <>
                                    <br />
                                    by {page.updated_by}
                                  </>
                                ) : null}
                              </>
                            ) : (
                              "Never edited"
                            )}
                          </span>
                          <ChevronRight
                            aria-hidden
                            className="size-4 shrink-0 text-subtle"
                          />
                        </Link>
                        {page.path ? (
                          <a
                            href={siteLinks.page(page.path)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-ink hover:bg-ink/5"
                            aria-label={`Open ${page.label} on the website`}
                            title="Open on the website"
                          >
                            <ExternalLink aria-hidden className="size-4" />
                          </a>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </Card>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
