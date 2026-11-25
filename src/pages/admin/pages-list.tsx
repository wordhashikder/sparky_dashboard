import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronRight,
  CornerDownRight,
  ExternalLink,
  FilePlus2,
  FileText,
  Plus,
} from "lucide-react";
import { type FormEvent, useId, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Drawer } from "@/components/ui/drawer";
import { Field, Input, Notice, Select } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, ErrorState, PageLoader } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api";
import { siteLinks } from "@/lib/config";
import { adminApi } from "@/lib/endpoints";
import type { AdminPage } from "@/lib/types";

/** The built-in page that supporting pages can also hang under. */
export const ACCREDITATIONS_PAGE = {
  path: "/uk/accreditations/",
  title: "Electrician Accreditations",
};

export function pageStatus(page: AdminPage): {
  tone: BadgeTone;
  label: string;
  hint: string;
} {
  if (!page.is_published)
    return {
      tone: "neutral",
      label: "Draft",
      hint: "Only visible through Preview.",
    };
  if (!page.has_content)
    return {
      tone: "amber",
      label: "Waiting for content",
      hint: "Opens with its title and intro only, and stays hidden from Google.",
    };
  return {
    tone: "green",
    label: "Live",
    hint: "Visible on the website, in Google and in the sitemap.",
  };
}

/** Slug from words: "Cost guide" -> "cost-guide". */
export function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Every page you create, main pages first with their supporting pages beneath. */
export default function PagesListPage() {
  const [creating, setCreating] = useState(false);
  const query = useQuery({
    queryKey: ["admin", "pages"],
    queryFn: adminApi.pages,
  });

  const pages = query.data ?? [];
  const own = pages.filter((page) => !page.scheme_key);
  const schemePages = pages.filter((page) => page.scheme_key);

  return (
    <>
      <Link
        to="/content"
        className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-ink hover:underline"
      >
        <ArrowLeft aria-hidden className="size-4" /> Website content
      </Link>
      <PageHeader
        title="Pages"
        description="The four main pages, the supporting pages that hang under them, and one page for each accreditation scheme. A page stays hidden from Google until it is published and has content."
        actions={
          <Button
            onClick={() => setCreating(true)}
            icon={<Plus aria-hidden className="size-4" />}
          >
            New page
          </Button>
        }
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
          <Card className="overflow-hidden">
            {own.length ? (
              <ul className="divide-y divide-line">
                {own.map((page) => (
                  <PageRow key={page.id} page={page} />
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={<FileText aria-hidden className="size-6" />}
                title="No pages yet"
                text="Create your first page to get started."
                action={
                  <Button onClick={() => setCreating(true)}>New page</Button>
                }
              />
            )}
          </Card>

          {schemePages.length ? (
            <section aria-labelledby="scheme-pages">
              <h2 id="scheme-pages" className="mb-1 text-[15px] font-semibold">
                Accreditation pages
              </h2>
              <p className="mb-3 text-xs text-subtle">
                One page for each scheme, under {ACCREDITATIONS_PAGE.path}. Add
                the content and the “About …” link appears on profile cards.
                Schemes are managed in{" "}
                <Link
                  to="/content/accreditations"
                  className="font-semibold underline"
                >
                  Accreditation schemes
                </Link>
                .
              </p>
              <Card className="overflow-hidden">
                <ul className="divide-y divide-line">
                  {schemePages.map((page) => (
                    <PageRow key={page.id} page={page} />
                  ))}
                </ul>
              </Card>
            </section>
          ) : null}
        </div>
      )}
      <NewPageDrawer
        open={creating}
        onClose={() => setCreating(false)}
        mains={own.filter((page) => page.parent_path === null)}
      />
    </>
  );
}

function PageRow({ page }: { page: AdminPage }) {
  const status = pageStatus(page);
  const supporting = page.parent_path !== null && !page.scheme_key;
  return (
    <li className="flex items-center gap-2 pr-3">
      <Link
        to={`/content/pages/${page.id}`}
        className={`flex min-w-0 flex-1 items-center gap-4 py-4 pr-2 transition-colors hover:bg-surface ${
          supporting ? "pl-10" : "pl-5"
        }`}
      >
        {supporting ? (
          <CornerDownRight
            aria-hidden
            className="-ml-5 size-4 shrink-0 text-subtle"
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">
            {page.title}
            <Badge tone={status.tone}>{status.label}</Badge>
            {!supporting && !page.scheme_key ? (
              <Badge tone="blue">Main page</Badge>
            ) : null}
          </p>
          <p className="mt-0.5 truncate font-mono text-xs text-subtle">
            {page.path}
          </p>
        </div>
        {page.child_count > 0 ? (
          <span className="hidden shrink-0 text-xs text-subtle sm:block">
            {page.child_count} supporting{" "}
            {page.child_count === 1 ? "page" : "pages"}
          </span>
        ) : null}
        <ChevronRight aria-hidden className="size-4 shrink-0 text-subtle" />
      </Link>
      {page.is_published ? (
        <a
          href={siteLinks.page(page.path)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-ink hover:bg-ink/5"
          aria-label={`Open ${page.title} on the website`}
          title="Open on the website"
        >
          <ExternalLink aria-hidden className="size-4" />
        </a>
      ) : (
        <span className="size-8 shrink-0" aria-hidden />
      )}
    </li>
  );
}

function NewPageDrawer({
  open,
  onClose,
  mains,
}: {
  open: boolean;
  onClose: () => void;
  mains: AdminPage[];
}) {
  const id = useId();
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [parent, setParent] = useState("");
  const [path, setPath] = useState("");
  const [edited, setEdited] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // The address follows the title and the main page until it is edited by hand.
  const suggested = (nextTitle: string, nextParent: string) => {
    const slug = slugify(nextTitle);
    if (!slug) return "";
    return nextParent ? `${nextParent}${slug}/` : `/uk/${slug}/`;
  };

  const create = useMutation({
    mutationFn: adminApi.createPage,
    onSuccess: (page) => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "pages"] });
      toast.success("Page created as a draft.");
      onClose();
      navigate(`/content/pages/${page.id}`);
    },
    onError: (error) => {
      if (error instanceof ApiError && error.fields) setErrors(error.fields);
      else
        toast.error(
          error instanceof ApiError ? error.message : "Couldn't create page.",
        );
    },
  });

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    setErrors({});
    create.mutate({
      title: title.trim(),
      path: path.trim(),
      parent_path: parent || null,
      is_published: false,
    });
  }

  const parents = [
    ...mains.map((page) => ({ path: page.path, title: page.title })),
    ACCREDITATIONS_PAGE,
  ];

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="New page"
      description="It starts as a draft: nobody sees it until you publish it."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            form={`${id}-form`}
            loading={create.isPending}
            icon={<FilePlus2 aria-hidden className="size-4" />}
          >
            Create page
          </Button>
        </>
      }
    >
      <form
        id={`${id}-form`}
        onSubmit={onSubmit}
        className="space-y-4 px-6 py-5"
      >
        {errors.content ? <Notice tone="error">{errors.content}</Notice> : null}
        <Field
          label="Page title"
          htmlFor={`${id}-title`}
          error={errors.title}
          hint="Shown as the main heading, e.g. “How much does a home charger cost?”."
        >
          <Input
            id={`${id}-title`}
            value={title}
            maxLength={120}
            required
            aria-invalid={!!errors.title}
            onChange={(event) => {
              setTitle(event.target.value);
              if (!edited) setPath(suggested(event.target.value, parent));
            }}
          />
        </Field>
        <Field
          label="This page supports"
          htmlFor={`${id}-parent`}
          error={errors.parent_path}
          hint="Choose a main page to make this a supporting page that links back to it. Leave empty for a new main page."
        >
          <Select
            id={`${id}-parent`}
            value={parent}
            onChange={(event) => {
              setParent(event.target.value);
              if (!edited) setPath(suggested(title, event.target.value));
            }}
          >
            <option value="">None (a main page)</option>
            {parents.map((item) => (
              <option key={item.path} value={item.path}>
                {item.title}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Web address"
          htmlFor={`${id}-path`}
          error={errors.path}
          hint="Lower-case words with hyphens, e.g. /uk/home-ev-charger-installation/cost/. You can change it later: the old address will redirect."
        >
          <Input
            id={`${id}-path`}
            value={path}
            maxLength={200}
            required
            spellCheck={false}
            className="font-mono"
            aria-invalid={!!errors.path}
            onChange={(event) => {
              setEdited(true);
              setPath(event.target.value);
            }}
          />
        </Field>
      </form>
    </Drawer>
  );
}
