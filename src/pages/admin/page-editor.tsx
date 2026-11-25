import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ExternalLink,
  Eye,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Link, useBlocker, useNavigate, useParams } from "react-router";
import { ImagePicker } from "@/components/content/image-picker";
import { MarkdownEditor } from "@/components/content/markdown-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Notice, Select, Textarea } from "@/components/ui/form";
import { ErrorState, PageLoader } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api";
import { siteLinks } from "@/lib/config";
import { adminApi } from "@/lib/endpoints";
import { timeAgo } from "@/lib/format";
import type { AdminPage, PageFaq, PageSection, PageUpdate } from "@/lib/types";
import { ACCREDITATIONS_PAGE, pageStatus } from "./pages-list";

const MAX_SECTIONS = 30;
const MAX_FAQ = 30;
const clone = <T,>(value: T): T => structuredClone(value);
const same = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);

type Draft = Pick<
  AdminPage,
  | "title"
  | "path"
  | "parent_path"
  | "eyebrow"
  | "intro"
  | "hero_image_url"
  | "hero_image_alt"
  | "sections"
  | "faq"
  | "seo_title"
  | "seo_description"
  | "is_published"
>;

const draftOf = (page: AdminPage): Draft => ({
  title: page.title,
  path: page.path,
  parent_path: page.parent_path,
  eyebrow: page.eyebrow,
  intro: page.intro,
  hero_image_url: page.hero_image_url,
  hero_image_alt: page.hero_image_alt,
  sections: clone(page.sections),
  faq: clone(page.faq),
  seo_title: page.seo_title,
  seo_description: page.seo_description,
  is_published: page.is_published,
});

/** Only what changed, with empty text sent as "nothing". */
function changes(draft: Draft, saved: Draft): PageUpdate {
  const body: Record<string, unknown> = {};
  for (const key of Object.keys(draft) as (keyof Draft)[]) {
    if (same(draft[key], saved[key])) continue;
    const value = draft[key];
    body[key] = typeof value === "string" && value.trim() === "" ? null : value;
  }
  if ("title" in body && body.title === null) body.title = draft.title;
  return body as PageUpdate;
}

/**
 * Edit one page: its heading and intro, address, sections (Markdown with images),
 * questions and answers, and its search title and description.
 */
export default function PageEditorPage() {
  const { pageId = "" } = useParams();
  const query = useQuery({
    queryKey: ["admin", "pages", pageId],
    queryFn: () => adminApi.page(pageId),
  });
  if (query.isPending) return <PageLoader />;
  if (query.isError)
    return (
      <Card>
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      </Card>
    );
  return (
    <Editor key={`${pageId}-${query.data.updated_at}`} page={query.data} />
  );
}

function Editor({ page }: { page: AdminPage }) {
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const saved = useMemo(() => draftOf(page), [page]);
  const [draft, setDraft] = useState<Draft>(() => clone(saved));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const dirty = !same(draft, saved);
  const status = pageStatus(page);
  const allPages = useQuery({
    queryKey: ["admin", "pages"],
    queryFn: adminApi.pages,
  });

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) =>
      Object.fromEntries(
        Object.entries(current).filter(([name]) => !name.startsWith(key)),
      ),
    );
  };

  const save = useMutation({
    mutationFn: () => adminApi.updatePage(page.id, changes(draft, saved)),
    onSuccess: (updated) => {
      setErrors({});
      queryClient.setQueryData(["admin", "pages", page.id], updated);
      void queryClient.invalidateQueries({ queryKey: ["admin", "pages"] });
      void queryClient.invalidateQueries({
        queryKey: ["admin", "accreditation-schemes"],
      });
      toast.success(
        updated.is_published
          ? "Saved. The website shows the new version now."
          : "Saved as a draft.",
      );
    },
    onError: (error) => {
      if (error instanceof ApiError && error.fields) {
        setErrors(error.fields);
        toast.error("Some fields need attention.");
      } else
        toast.error(
          error instanceof ApiError ? error.message : "Couldn't save.",
        );
    },
  });
  const remove = useMutation({
    mutationFn: () => adminApi.deletePage(page.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "pages"] });
      toast.success("Page deleted.");
      navigate("/content/pages", { replace: true });
    },
    onError: (error) =>
      toast.error(
        error instanceof ApiError ? error.message : "Couldn't delete the page.",
      ),
  });
  const preview = useMutation({
    mutationFn: () => adminApi.previewPage(page.id),
    onSuccess: ({ token }) =>
      window.open(
        `${siteLinks.page(page.path)}?preview=${encodeURIComponent(token)}`,
        "_blank",
        "noopener",
      ),
    onError: () => toast.error("Couldn't open the preview."),
  });

  // Warn before leaving with unsaved changes.
  const blocker = useBlocker(dirty && !save.isPending && !remove.isPending);
  useEffect(() => {
    if (blocker.state !== "blocked") return;
    if (window.confirm("You have unsaved changes. Leave without saving?"))
      blocker.proceed();
    else blocker.reset();
  }, [blocker]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const linkTargets = useMemo(
    () => [
      ACCREDITATIONS_PAGE,
      ...(allPages.data ?? [])
        .filter((item) => item.id !== page.id)
        .map((item) => ({ path: item.path, title: item.title })),
    ],
    [allPages.data, page.id],
  );
  const mains = (allPages.data ?? []).filter(
    (item) =>
      item.parent_path === null && !item.scheme_key && item.id !== page.id,
  );
  const messages = Object.values(errors);
  const isSchemePage = page.scheme_key !== null;

  return (
    <>
      <div className="sticky top-16 z-10 -mx-4 mb-6 border-b border-line bg-canvas/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              to="/content/pages"
              className="inline-flex size-9 items-center justify-center rounded-lg text-ink hover:bg-ink/5"
              aria-label="All pages"
            >
              <ArrowLeft aria-hidden className="size-5" />
            </Link>
            <div className="min-w-0">
              <h1 className="flex flex-wrap items-center gap-2 text-lg font-bold">
                {page.title}
                <Badge tone={status.tone}>{status.label}</Badge>
                {dirty ? <Badge tone="amber">Unsaved changes</Badge> : null}
              </h1>
              <p className="truncate font-mono text-xs text-subtle">
                {page.path} · updated {timeAgo(page.updated_at)}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {page.is_published ? (
              <a
                href={siteLinks.page(page.path)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-ink hover:bg-ink/5"
              >
                <ExternalLink aria-hidden className="size-4" />
                <span className="hidden sm:inline">View page</span>
              </a>
            ) : null}
            <Button
              variant="ghost"
              loading={preview.isPending}
              disabled={dirty}
              title={dirty ? "Save your changes to preview them" : undefined}
              onClick={() => preview.mutate()}
              icon={<Eye aria-hidden className="size-4" />}
            >
              <span className="hidden sm:inline">Preview</span>
            </Button>
            {dirty ? (
              <Button variant="outline" onClick={() => setDraft(clone(saved))}>
                Discard
              </Button>
            ) : null}
            <Button
              loading={save.isPending}
              disabled={!dirty}
              onClick={() => save.mutate()}
              icon={<Save aria-hidden className="size-4" />}
            >
              Save
            </Button>
          </div>
        </div>
      </div>

      {messages.length ? (
        <Notice tone="error" className="mb-5">
          <p className="font-semibold">This page can't be saved yet:</p>
          <ul className="mt-1 list-disc pl-5">
            {messages.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </Notice>
      ) : null}

      <div className="mx-auto max-w-3xl space-y-5">
        <Notice tone={status.tone === "green" ? "success" : "info"}>
          <strong>{status.label}.</strong> {status.hint}
        </Notice>

        <Card className="space-y-4 p-5">
          <h2 className="text-[15px] font-semibold">
            Heading and introduction
          </h2>
          <Field
            label="Page title"
            htmlFor="page-title"
            error={errors.title}
            aside={`${draft.title.length}/120`}
          >
            <Input
              id="page-title"
              value={draft.title}
              maxLength={120}
              onChange={(event) => set("title", event.target.value)}
            />
          </Field>
          <Field
            label="Small heading above the title (optional)"
            htmlFor="page-eyebrow"
            error={errors.eyebrow}
            aside={`${(draft.eyebrow ?? "").length}/60`}
          >
            <Input
              id="page-eyebrow"
              value={draft.eyebrow ?? ""}
              maxLength={60}
              onChange={(event) => set("eyebrow", event.target.value)}
            />
          </Field>
          <Field
            label="Introduction"
            htmlFor="page-intro"
            error={errors.intro}
            aside={`${(draft.intro ?? "").length}/600`}
            hint="One or two sentences under the title. Also used on the main page's list of supporting pages."
          >
            <Textarea
              id="page-intro"
              value={draft.intro ?? ""}
              maxLength={600}
              onChange={(event) => set("intro", event.target.value)}
            />
          </Field>
          <div>
            <p className="mb-1.5 text-[13px] font-semibold">
              Main image (optional)
            </p>
            <ImagePicker
              value={draft.hero_image_url}
              onChange={(url) => {
                set("hero_image_url", url);
                if (!url) set("hero_image_alt", null);
              }}
            />
            {draft.hero_image_url ? (
              <Field
                className="mt-3"
                label="Describe the image"
                htmlFor="page-hero-alt"
                error={errors.hero_image_alt}
                hint="For people who can't see it, and for Google."
              >
                <Input
                  id="page-hero-alt"
                  value={draft.hero_image_alt ?? ""}
                  maxLength={160}
                  onChange={(event) =>
                    set("hero_image_alt", event.target.value)
                  }
                />
              </Field>
            ) : null}
          </div>
        </Card>

        <SectionsCard
          sections={draft.sections}
          linkTargets={linkTargets}
          onChange={(sections) => set("sections", sections)}
        />

        <FaqCard faq={draft.faq} onChange={(faq) => set("faq", faq)} />

        <Card className="space-y-4 p-5">
          <h2 className="text-[15px] font-semibold">Address and publishing</h2>
          <Field
            label="Web address"
            htmlFor="page-path"
            error={errors.path}
            hint={
              page.previous_paths.length
                ? `Old addresses that redirect here: ${page.previous_paths.join(", ")}`
                : "If you change it, the old address redirects to the new one automatically."
            }
          >
            <Input
              id="page-path"
              value={draft.path}
              maxLength={200}
              spellCheck={false}
              className="font-mono"
              onChange={(event) => set("path", event.target.value)}
            />
          </Field>
          <Field
            label="This page supports"
            htmlFor="page-parent"
            error={errors.parent_path}
            hint={
              page.child_count > 0
                ? "This page has supporting pages of its own, so it stays a main page."
                : "A supporting page shows a link back to its main page."
            }
          >
            <Select
              id="page-parent"
              value={draft.parent_path ?? ""}
              disabled={page.child_count > 0}
              onChange={(event) =>
                set("parent_path", event.target.value || null)
              }
            >
              <option value="">None (a main page)</option>
              {isSchemePage ? null : (
                <option value={ACCREDITATIONS_PAGE.path}>
                  {ACCREDITATIONS_PAGE.title}
                </option>
              )}
              {isSchemePage ? (
                <option value={ACCREDITATIONS_PAGE.path}>
                  {ACCREDITATIONS_PAGE.title}
                </option>
              ) : null}
              {mains.map((item) => (
                <option key={item.id} value={item.path}>
                  {item.title}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Visibility"
            htmlFor="page-published"
            hint="A draft is only visible through Preview. A published page without content opens with its title and intro but stays hidden from Google."
          >
            <Select
              id="page-published"
              value={draft.is_published ? "published" : "draft"}
              onChange={(event) =>
                set("is_published", event.target.value === "published")
              }
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </Select>
          </Field>
        </Card>

        <Card className="space-y-4 p-5">
          <h2 className="text-[15px] font-semibold">Search results (SEO)</h2>
          <Field
            label="Search title"
            htmlFor="page-seo-title"
            error={errors.seo_title}
            aside={`${(draft.seo_title ?? "").length}/70`}
            hint="The blue headline in Google. Leave empty to use the page title."
          >
            <Input
              id="page-seo-title"
              value={draft.seo_title ?? ""}
              maxLength={70}
              onChange={(event) => set("seo_title", event.target.value)}
            />
          </Field>
          <Field
            label="Search description"
            htmlFor="page-seo-description"
            error={errors.seo_description}
            aside={`${(draft.seo_description ?? "").length}/160`}
            hint="The grey text under it. Leave empty to use the introduction."
          >
            <Textarea
              id="page-seo-description"
              value={draft.seo_description ?? ""}
              maxLength={160}
              rows={3}
              onChange={(event) => set("seo_description", event.target.value)}
            />
          </Field>
        </Card>

        {isSchemePage ? (
          <p className="text-xs text-subtle">
            This is the page of an accreditation scheme, so it can't be deleted.
            Switch the scheme off in{" "}
            <Link to="/content/accreditations" className="underline">
              Accreditation schemes
            </Link>{" "}
            to retire it.
          </p>
        ) : (
          <div className="flex justify-end">
            <Button
              variant="ghost"
              className="text-red-600 hover:bg-red-50"
              loading={remove.isPending}
              disabled={page.child_count > 0}
              title={
                page.child_count > 0
                  ? "Delete or move its supporting pages first"
                  : undefined
              }
              onClick={() => {
                if (
                  window.confirm(
                    `Delete “${page.title}”? Its address will stop working.`,
                  )
                )
                  remove.mutate();
              }}
              icon={<Trash2 aria-hidden className="size-4" />}
            >
              Delete page
            </Button>
          </div>
        )}
      </div>
    </>
  );
}

// ---- Sections ------------------------------------------------------------------------

type LinkTarget = { path: string; title: string };

function SectionsCard({
  sections,
  linkTargets,
  onChange,
}: {
  sections: PageSection[];
  linkTargets: LinkTarget[];
  onChange: (sections: PageSection[]) => void;
}) {
  const keys = useRef<string[]>([]);
  const idBase = useId();
  // Stable keys so a section keeps its focus and text while others move.
  while (keys.current.length < sections.length)
    keys.current.push(`${idBase}-${keys.current.length}-${Math.random()}`);
  const update = (index: number, patch: Partial<PageSection>) =>
    onChange(
      sections.map((item, at) => (at === index ? { ...item, ...patch } : item)),
    );
  const move = (from: number, to: number) => {
    const next = [...sections];
    const [moved] = next.splice(from, 1);
    const [key] = keys.current.splice(from, 1);
    if (moved && key) {
      next.splice(to, 0, moved);
      keys.current.splice(to, 0, key);
    }
    onChange(next);
  };

  return (
    <Card className="space-y-4 p-5">
      <div>
        <h2 className="text-[15px] font-semibold">Content</h2>
        <p className="mt-0.5 text-xs text-subtle">
          Each section has a heading and text. Write in plain text, or use{" "}
          <code>**bold**</code>, <code>- bullet</code> lists and{" "}
          <code>[link text](/uk/page/)</code>. Use “Insert image” to place a
          picture inside the text.
        </p>
      </div>
      {sections.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line px-4 py-6 text-center text-sm text-subtle">
          No sections yet. A page without content stays hidden from Google.
        </p>
      ) : null}
      {sections.map((section, index) => (
        <SectionEditor
          key={keys.current[index]}
          index={index}
          total={sections.length}
          section={section}
          linkTargets={linkTargets}
          onChange={(patch) => update(index, patch)}
          onMove={(to) => move(index, to)}
          onRemove={() => {
            keys.current.splice(index, 1);
            onChange(sections.filter((_, at) => at !== index));
          }}
        />
      ))}
      <Button
        variant="outline"
        disabled={sections.length >= MAX_SECTIONS}
        onClick={() =>
          onChange([
            ...sections,
            { heading: "", body: "", image_url: null, image_alt: null },
          ])
        }
        icon={<Plus aria-hidden className="size-4" />}
      >
        Add a section
      </Button>
    </Card>
  );
}

function SectionEditor({
  index,
  total,
  section,
  linkTargets,
  onChange,
  onMove,
  onRemove,
}: {
  index: number;
  total: number;
  section: PageSection;
  linkTargets: LinkTarget[];
  onChange: (patch: Partial<PageSection>) => void;
  onMove: (to: number) => void;
  onRemove: () => void;
}) {
  const id = useId();
  return (
    <fieldset className="space-y-3 rounded-xl border border-line p-4">
      <legend className="sr-only">Section {index + 1}</legend>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold tracking-[0.1em] text-subtle uppercase">
          Section {index + 1}
        </p>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            disabled={index === 0}
            aria-label={`Move section ${index + 1} up`}
            onClick={() => onMove(index - 1)}
          >
            <ArrowUp aria-hidden className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            disabled={index === total - 1}
            aria-label={`Move section ${index + 1} down`}
            onClick={() => onMove(index + 1)}
          >
            <ArrowDown aria-hidden className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-red-600 hover:bg-red-50"
            aria-label={`Remove section ${index + 1}`}
            onClick={() => {
              if (window.confirm("Remove this section?")) onRemove();
            }}
          >
            <Trash2 aria-hidden className="size-4" />
          </Button>
        </div>
      </div>
      <Field label="Heading" htmlFor={`${id}-heading`}>
        <Input
          id={`${id}-heading`}
          value={section.heading}
          maxLength={120}
          onChange={(event) => onChange({ heading: event.target.value })}
        />
      </Field>
      <Field
        label="Text"
        htmlFor={`${id}-body`}
        aside={`${section.body.length}/20000`}
      >
        <MarkdownEditor
          id={`${id}-body`}
          value={section.body}
          onChange={(body) => onChange({ body })}
          maxLength={20000}
          rows={9}
          images
          linkTargets={linkTargets}
          preview="page"
        />
      </Field>
      <details open={!!section.image_url}>
        <summary className="cursor-pointer text-[13px] font-semibold text-ink">
          Picture beside this section (optional)
        </summary>
        <div className="mt-3 space-y-3">
          <ImagePicker
            value={section.image_url}
            onChange={(url) =>
              onChange({
                image_url: url,
                image_alt: url ? section.image_alt : null,
              })
            }
          />
          {section.image_url ? (
            <Field label="Describe the image" htmlFor={`${id}-alt`}>
              <Input
                id={`${id}-alt`}
                value={section.image_alt ?? ""}
                maxLength={160}
                onChange={(event) =>
                  onChange({ image_alt: event.target.value })
                }
              />
            </Field>
          ) : null}
        </div>
      </details>
    </fieldset>
  );
}

// ---- Questions and answers -----------------------------------------------------------

function FaqCard({
  faq,
  onChange,
}: {
  faq: PageFaq[];
  onChange: (faq: PageFaq[]) => void;
}) {
  const id = useId();
  const keys = useRef<string[]>([]);
  while (keys.current.length < faq.length)
    keys.current.push(`${id}-${keys.current.length}-${Math.random()}`);
  const update = (index: number, patch: Partial<PageFaq>) =>
    onChange(
      faq.map((item, at) => (at === index ? { ...item, ...patch } : item)),
    );
  return (
    <Card className="space-y-4 p-5">
      <div>
        <h2 className="text-[15px] font-semibold">
          Questions and answers (optional)
        </h2>
        <p className="mt-0.5 text-xs text-subtle">
          Shown at the bottom of the page and passed to Google as an FAQ.
        </p>
      </div>
      {faq.map((item, index) => (
        <fieldset
          key={keys.current[index]}
          className="space-y-3 rounded-xl border border-line p-4"
        >
          <legend className="sr-only">Question {index + 1}</legend>
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold tracking-[0.1em] text-subtle uppercase">
              Question {index + 1}
            </p>
            <Button
              variant="ghost"
              size="icon"
              className="text-red-600 hover:bg-red-50"
              aria-label={`Remove question ${index + 1}`}
              onClick={() => {
                keys.current.splice(index, 1);
                onChange(faq.filter((_, at) => at !== index));
              }}
            >
              <Trash2 aria-hidden className="size-4" />
            </Button>
          </div>
          <Field label="Question" htmlFor={`${id}-q-${index}`}>
            <Input
              id={`${id}-q-${index}`}
              value={item.question}
              maxLength={200}
              onChange={(event) =>
                update(index, { question: event.target.value })
              }
            />
          </Field>
          <Field label="Answer" htmlFor={`${id}-a-${index}`}>
            <Textarea
              id={`${id}-a-${index}`}
              value={item.answer}
              maxLength={2000}
              rows={4}
              onChange={(event) =>
                update(index, { answer: event.target.value })
              }
            />
          </Field>
        </fieldset>
      ))}
      <Button
        variant="outline"
        disabled={faq.length >= MAX_FAQ}
        onClick={() => onChange([...faq, { question: "", answer: "" }])}
        icon={<Plus aria-hidden className="size-4" />}
      >
        Add a question
      </Button>
    </Card>
  );
}
