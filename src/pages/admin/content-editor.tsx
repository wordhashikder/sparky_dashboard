import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ExternalLink,
  History,
  ImagePlus,
  Plus,
  RotateCcw,
  Save,
  Trash2,
} from "lucide-react";
import {
  type ReactNode,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link, useBlocker, useParams } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Drawer } from "@/components/ui/drawer";
import { Field, Input, Notice, Textarea } from "@/components/ui/form";
import { EmptyState, ErrorState, PageLoader } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api";
import { config, siteLinks } from "@/lib/config";
import { adminApi } from "@/lib/endpoints";
import { formatDateTime, timeAgo } from "@/lib/format";
import type {
  ContentData,
  ContentDocument,
  ContentValue,
  FieldSchema,
  SectionSchema,
} from "@/lib/types";
import { cn } from "@/lib/utils";

type Item = Record<string, string>;
const clone = <T,>(value: T): T => structuredClone(value);
const same = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);

/** Site paths are shown from the public website. */
const imageSrc = (url: string) =>
  url.startsWith("/") ? `${config.siteUrl}${url}` : url;

/**
 * Edit one page: its sections in order, each field with its limits, lists you
 * can add to, reorder and trim, and the page's SEO. "Save & publish" puts it
 * live within seconds; every version is kept in the history.
 */
export default function ContentEditorPage() {
  const { key = "" } = useParams();
  const query = useQuery({
    queryKey: ["admin", "content", key],
    queryFn: () => adminApi.content(key),
  });
  if (query.isPending) return <PageLoader />;
  if (query.isError)
    return (
      <Card>
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      </Card>
    );
  return (
    <Editor
      key={`${key}-${query.data.updated_at}`}
      pageKey={key}
      doc={query.data}
    />
  );
}

function Editor({ pageKey, doc }: { pageKey: string; doc: ContentDocument }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<ContentData>(() => clone(doc.content));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [historyOpen, setHistoryOpen] = useState(false);
  const dirty = !same(draft, doc.content);
  const schema = doc.schema;

  const refresh = (updated: ContentDocument) => {
    queryClient.setQueryData(["admin", "content", pageKey], updated);
    void queryClient.invalidateQueries({
      queryKey: ["admin", "content"],
      exact: true,
    });
    void queryClient.invalidateQueries({
      queryKey: ["admin", "content-revisions", pageKey],
    });
  };
  const onError = (error: unknown) => {
    if (error instanceof ApiError && error.fields) {
      setErrors(error.fields);
      toast.error("Some fields need attention.");
      const first = Object.keys(error.fields)[0];
      if (first)
        document
          .getElementById(`field-${first}`)
          ?.scrollIntoView({ block: "center", behavior: "smooth" });
    } else {
      toast.error(error instanceof ApiError ? error.message : "Couldn't save.");
    }
  };
  const save = useMutation({
    mutationFn: () => adminApi.saveContent(pageKey, draft),
    onSuccess: (updated) => {
      setErrors({});
      refresh(updated);
      toast.success("Published. The website shows the new version now.");
    },
    onError,
  });
  const reset = useMutation({
    mutationFn: () => adminApi.resetContent(pageKey),
    onSuccess: (updated) => {
      setErrors({});
      refresh(updated);
      toast.success(
        "Back to the original wording. The old version is in the history.",
      );
    },
    onError,
  });

  // Warn before leaving with unsaved changes (in the app and when closing the tab).
  const blocker = useBlocker(dirty && !save.isPending);
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

  const setValue = (section: string, field: string, value: ContentValue) => {
    setDraft((current) => ({
      ...current,
      [section]: { ...current[section], [field]: value },
    }));
    setErrors((current) => {
      const prefix = `${section}.${field}`;
      if (!Object.keys(current).some((k) => k.startsWith(prefix)))
        return current;
      return Object.fromEntries(
        Object.entries(current).filter(([k]) => !k.startsWith(prefix)),
      );
    });
  };

  const errorCount = Object.keys(errors).length;

  return (
    <>
      <div className="sticky top-16 z-10 -mx-4 mb-6 border-b border-line bg-canvas/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              to="/content"
              className="inline-flex size-9 items-center justify-center rounded-lg text-ink hover:bg-ink/5"
              aria-label="All pages"
            >
              <ArrowLeft aria-hidden className="size-5" />
            </Link>
            <div className="min-w-0">
              <h1 className="flex flex-wrap items-center gap-2 text-lg font-bold">
                {schema.label}
                {doc.customised ? (
                  <Badge tone="green">Edited</Badge>
                ) : (
                  <Badge>Original</Badge>
                )}
                {dirty ? <Badge tone="amber">Unsaved changes</Badge> : null}
              </h1>
              <p className="truncate text-xs text-subtle">
                {doc.updated_at
                  ? `Last published ${timeAgo(doc.updated_at)}${doc.updated_by ? ` by ${doc.updated_by}` : ""}`
                  : "Showing the original wording"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {schema.path ? (
              <a
                href={siteLinks.page(schema.path)}
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
              onClick={() => setHistoryOpen(true)}
              icon={<History aria-hidden className="size-4" />}
            >
              <span className="hidden sm:inline">History</span>
            </Button>
            {dirty ? (
              <Button
                variant="outline"
                onClick={() => setDraft(clone(doc.content))}
              >
                Discard
              </Button>
            ) : null}
            <Button
              loading={save.isPending}
              disabled={!dirty}
              onClick={() => save.mutate()}
              icon={<Save aria-hidden className="size-4" />}
            >
              Save &amp; publish
            </Button>
          </div>
        </div>
      </div>

      {errorCount ? (
        <Notice tone="error" className="mb-5">
          {errorCount === 1 ? "One field needs" : `${errorCount} fields need`}{" "}
          attention before this page can be published.
        </Notice>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav
          aria-label="Sections"
          className="lg:sticky lg:top-36 lg:self-start"
        >
          <p className="mb-2 text-[11px] font-semibold tracking-[0.12em] text-subtle uppercase">
            Sections
          </p>
          <ul className="flex gap-1 overflow-x-auto lg:flex-col">
            {schema.sections.map((section) => {
              const hasError = Object.keys(errors).some((k) =>
                k.startsWith(`${section.key}.`),
              );
              const changed = !same(
                draft[section.key],
                doc.content[section.key],
              );
              return (
                <li key={section.key}>
                  <a
                    href={`#section-${section.key}`}
                    className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm whitespace-nowrap text-ink hover:bg-white"
                  >
                    {section.label}
                    {hasError ? (
                      <span className="size-2 rounded-full bg-red-500">
                        <span className="sr-only">has errors</span>
                      </span>
                    ) : changed ? (
                      <span className="size-2 rounded-full bg-amber-400">
                        <span className="sr-only">changed</span>
                      </span>
                    ) : null}
                  </a>
                </li>
              );
            })}
          </ul>
          {Object.keys(doc.tokens).length ? (
            <TokenHelp tokens={doc.tokens} />
          ) : null}
          {doc.customised ? (
            <Button
              variant="ghost"
              size="sm"
              className="mt-4 text-red-600 hover:bg-red-50"
              loading={reset.isPending}
              onClick={() => {
                if (
                  window.confirm(
                    "Restore the original wording for the whole page? The current version stays in the history.",
                  )
                )
                  reset.mutate();
              }}
              icon={<RotateCcw aria-hidden className="size-4" />}
            >
              Restore original
            </Button>
          ) : null}
        </nav>

        <div className="min-w-0 space-y-5">
          {schema.sections.map((section) => (
            <SectionCard
              key={section.key}
              section={section}
              values={draft[section.key] ?? {}}
              defaults={doc.defaults[section.key] ?? {}}
              errors={errors}
              onChange={(field, value) => setValue(section.key, field, value)}
            />
          ))}
        </div>
      </div>

      <HistoryDrawer
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        pageKey={pageKey}
        dirty={dirty}
        onRestored={(updated) => {
          refresh(updated);
          setHistoryOpen(false);
        }}
      />
    </>
  );
}

function TokenHelp({ tokens }: { tokens: Record<string, string> }) {
  return (
    <details className="mt-5 rounded-xl border border-line bg-white p-3 text-xs">
      <summary className="cursor-pointer font-semibold text-ink">
        Smart words
      </summary>
      <p className="mt-2 text-subtle">
        Type these in any field; the website fills them in.
      </p>
      <dl className="mt-2 space-y-1.5">
        {Object.entries(tokens).map(([token, text]) => (
          <div key={token}>
            <dt className="font-mono text-ink">{token}</dt>
            <dd className="text-subtle">{text}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

function SectionCard({
  section,
  values,
  defaults,
  errors,
  onChange,
}: {
  section: SectionSchema;
  values: Record<string, ContentValue>;
  defaults: Record<string, ContentValue>;
  errors: Record<string, string>;
  onChange: (field: string, value: ContentValue) => void;
}) {
  const changedFromOriginal = !same(values, defaults);
  return (
    <Card id={`section-${section.key}`} className="scroll-mt-40">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <h2 className="text-[15px] font-semibold">{section.label}</h2>
          {section.help ? (
            <p className="mt-0.5 text-[13px]">{section.help}</p>
          ) : null}
        </div>
        {changedFromOriginal ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              for (const field of section.fields) {
                onChange(field.key, clone(defaults[field.key] ?? ""));
              }
            }}
            icon={<RotateCcw aria-hidden className="size-3.5" />}
          >
            Original wording
          </Button>
        ) : null}
      </header>
      <div className="space-y-5 p-5">
        {section.key === "seo" ? (
          <SearchPreview
            title={String(values.title ?? "")}
            description={String(values.description ?? "")}
          />
        ) : null}
        {section.fields.map((field) =>
          field.type === "list" ? (
            <ListField
              key={field.key}
              field={field}
              path={`${section.key}.${field.key}`}
              items={(values[field.key] as Item[] | undefined) ?? []}
              errors={errors}
              onChange={(items) => onChange(field.key, items)}
            />
          ) : (
            <ValueField
              key={field.key}
              field={field}
              path={`${section.key}.${field.key}`}
              value={String(values[field.key] ?? "")}
              error={errors[`${section.key}.${field.key}`]}
              onChange={(value) => onChange(field.key, value)}
            />
          ),
        )}
      </div>
    </Card>
  );
}

function SearchPreview({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <p className="text-[11px] font-semibold tracking-wide text-subtle uppercase">
        Google preview
      </p>
      <p className="mt-2 truncate text-lg text-[#1a0dab]">
        {title || "Page title"}
      </p>
      <p className="mt-1 line-clamp-2 text-[13px] text-[#4d5156]">
        {description || "Meta description"}
      </p>
      {description.length > 160 ? (
        <p className="mt-2 text-xs text-amber-700">
          Google usually shortens descriptions over about 160 characters.
        </p>
      ) : null}
    </div>
  );
}

function ValueField({
  field,
  path,
  value,
  error,
  onChange,
}: {
  field: FieldSchema;
  path: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  const id = `field-${path}`;
  const counter = field.max_length
    ? `${value.length}/${field.max_length}`
    : undefined;
  const over = field.max_length ? value.length > field.max_length : false;
  const label = (
    <>
      {field.label}
      {!field.required ? (
        <span className="font-normal text-subtle"> (optional)</span>
      ) : null}
    </>
  );
  const common = {
    id,
    value,
    "aria-invalid": !!error || over || undefined,
    "aria-describedby": error ? `${id}-error` : undefined,
  };
  let control: ReactNode;
  if (field.type === "textarea" || field.type === "markdown") {
    control = (
      <Textarea
        {...common}
        rows={field.rows ?? (field.type === "markdown" ? 8 : 3)}
        onChange={(event) => onChange(event.target.value)}
        className={cn(field.type === "markdown" && "font-mono text-[13px]")}
      />
    );
  } else if (field.type === "image") {
    control = <ImageField {...common} value={value} onChange={onChange} />;
  } else {
    control = (
      <Input
        {...common}
        type={
          field.type === "email"
            ? "email"
            : field.type === "url"
              ? "text"
              : "text"
        }
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }
  const help =
    field.help ??
    (field.type === "markdown"
      ? "Markdown: ## headings, **bold**, - bullet lists and [links](/page/)."
      : field.type === "url"
        ? "A site path such as /faq/, or an https:// address."
        : undefined);
  return (
    <Field
      label={label}
      htmlFor={id}
      error={error}
      hint={help}
      aside={
        counter ? (
          <span className={cn(over && "font-semibold text-red-600")}>
            {counter}
          </span>
        ) : undefined
      }
    >
      {control}
    </Field>
  );
}

function ImageField({
  id,
  value,
  onChange,
  ...rest
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}) {
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const upload = useMutation({
    mutationFn: adminApi.uploadMedia,
    onSuccess: (result) => {
      onChange(result.url);
      toast.success("Image uploaded. Save & publish to use it.");
    },
    onError: (error) =>
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Couldn't upload the image.",
      ),
  });
  return (
    <div className="flex flex-wrap items-start gap-3">
      <div className="flex h-20 w-32 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line bg-surface">
        {value ? (
          <img
            src={imageSrc(value)}
            alt=""
            className="size-full object-cover"
          />
        ) : (
          <span className="text-xs text-subtle">No image</span>
        )}
      </div>
      <div className="min-w-56 flex-1 space-y-2">
        <Input
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          {...rest}
        />
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) upload.mutate(file);
            event.target.value = "";
          }}
        />
        <Button
          variant="outline"
          size="sm"
          loading={upload.isPending}
          onClick={() => input.current?.click()}
          icon={<ImagePlus aria-hidden className="size-4" />}
        >
          Upload image
        </Button>
      </div>
    </div>
  );
}

function ListField({
  field,
  path,
  items,
  errors,
  onChange,
}: {
  field: FieldSchema;
  path: string;
  items: Item[];
  errors: Record<string, string>;
  onChange: (items: Item[]) => void;
}) {
  const headingId = useId();
  const subFields = field.fields ?? [];
  const noun = field.item_label ?? "item";
  const canAdd =
    !field.fixed && (field.max_items == null || items.length < field.max_items);
  const canRemove = !field.fixed && items.length > (field.min_items ?? 0);
  // Stable keys for editing (items have no ids of their own).
  const keys = useMemo(
    () => items.map((_, index) => `${path}-${index}`),
    [items, path],
  );

  const move = (from: number, to: number) => {
    const next = [...items];
    const [moved] = next.splice(from, 1);
    if (moved) next.splice(to, 0, moved);
    onChange(next);
  };
  const empty = () => Object.fromEntries(subFields.map((sub) => [sub.key, ""]));
  const listError = errors[path];

  return (
    <fieldset aria-labelledby={headingId} id={`field-${path}`}>
      <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p id={headingId} className="text-[13px] font-semibold text-ink">
            {field.label}{" "}
            <span className="font-normal text-subtle">
              ({items.length}
              {field.fixed
                ? ""
                : field.max_items
                  ? ` of up to ${field.max_items}`
                  : ""}
              )
            </span>
          </p>
          {field.help ? (
            <p className="text-xs text-subtle">{field.help}</p>
          ) : null}
          {field.fixed ? (
            <p className="text-xs text-subtle">
              This list keeps {items.length} {noun}s (each pairs with an icon or
              photo); edit or reorder them.
            </p>
          ) : null}
        </div>
      </div>
      {listError ? (
        <p role="alert" className="mb-2 text-xs text-red-600">
          {listError}
        </p>
      ) : null}
      {items.length === 0 ? (
        <Card>
          <EmptyState title={`No ${noun}s yet`} />
        </Card>
      ) : (
        <ol className="space-y-3">
          {items.map((item, index) => (
            <li
              key={keys[index]}
              className="rounded-xl border border-line bg-surface/60 p-4"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-xs font-semibold tracking-wide text-subtle uppercase">
                  {noun} {index + 1}
                </p>
                <div className="flex items-center gap-1">
                  <IconButton
                    label={`Move ${noun} ${index + 1} up`}
                    disabled={index === 0}
                    onClick={() => move(index, index - 1)}
                  >
                    <ArrowUp aria-hidden className="size-4" />
                  </IconButton>
                  <IconButton
                    label={`Move ${noun} ${index + 1} down`}
                    disabled={index === items.length - 1}
                    onClick={() => move(index, index + 1)}
                  >
                    <ArrowDown aria-hidden className="size-4" />
                  </IconButton>
                  {canRemove ? (
                    <IconButton
                      label={`Remove ${noun} ${index + 1}`}
                      danger
                      onClick={() => {
                        if (window.confirm(`Remove this ${noun}?`))
                          onChange(items.filter((_, i) => i !== index));
                      }}
                    >
                      <Trash2 aria-hidden className="size-4" />
                    </IconButton>
                  ) : null}
                </div>
              </div>
              <div className="grid gap-4">
                {subFields.map((sub) => (
                  <ValueField
                    key={sub.key}
                    field={sub}
                    path={`${path}.${index}.${sub.key}`}
                    value={item[sub.key] ?? ""}
                    error={errors[`${path}.${index}.${sub.key}`]}
                    onChange={(value) =>
                      onChange(
                        items.map((current, i) =>
                          i === index
                            ? { ...current, [sub.key]: value }
                            : current,
                        ),
                      )
                    }
                  />
                ))}
              </div>
            </li>
          ))}
        </ol>
      )}
      {canAdd ? (
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => onChange([...items, empty()])}
          icon={<Plus aria-hidden className="size-4" />}
        >
          Add {noun}
        </Button>
      ) : null}
    </fieldset>
  );
}

function IconButton({
  label,
  disabled,
  danger,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  danger?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex size-8 cursor-pointer items-center justify-center rounded-md disabled:cursor-not-allowed disabled:opacity-30",
        danger ? "text-red-600 hover:bg-red-50" : "text-ink hover:bg-ink/5",
      )}
    >
      {children}
    </button>
  );
}

const actionLabels = {
  saved: "Published",
  reset: "Back to original",
  restored: "Restored an earlier version",
} as const;

function HistoryDrawer({
  open,
  onClose,
  pageKey,
  dirty,
  onRestored,
}: {
  open: boolean;
  onClose: () => void;
  pageKey: string;
  dirty: boolean;
  onRestored: (doc: ContentDocument) => void;
}) {
  const toast = useToast();
  const query = useQuery({
    queryKey: ["admin", "content-revisions", pageKey],
    queryFn: () => adminApi.contentRevisions(pageKey),
    enabled: open,
  });
  const restore = useMutation({
    mutationFn: (id: string) => adminApi.restoreContent(pageKey, id),
    onSuccess: (doc) => {
      toast.success("Version restored and published.");
      onRestored(doc);
    },
    onError: (error) =>
      toast.error(
        error instanceof ApiError ? error.message : "Couldn't restore.",
      ),
  });
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Version history"
      description="Every publish, reset and restore of this page (newest first)."
    >
      {dirty ? (
        <Notice tone="warning" className="mb-4">
          Restoring a version replaces your unsaved changes.
        </Notice>
      ) : null}
      {query.isPending ? (
        <PageLoader />
      ) : query.isError ? (
        <ErrorState error={query.error} />
      ) : query.data.length === 0 ? (
        <EmptyState
          title="No versions yet"
          text="This page still shows its original wording."
        />
      ) : (
        <ol className="space-y-3">
          {query.data.map((revision, index) => (
            <li
              key={revision.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-line px-4 py-3"
            >
              <div>
                <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                  {actionLabels[revision.action]}
                  {index === 0 ? <Badge tone="green">Current</Badge> : null}
                </p>
                <p className="text-xs text-subtle">
                  {formatDateTime(revision.created_at)}
                  {revision.author ? ` · ${revision.author}` : ""}
                </p>
              </div>
              {index > 0 ? (
                <Button
                  variant="outline"
                  size="sm"
                  loading={
                    restore.isPending && restore.variables === revision.id
                  }
                  onClick={() => {
                    if (window.confirm("Restore this version and publish it?"))
                      restore.mutate(revision.id);
                  }}
                >
                  Restore
                </Button>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </Drawer>
  );
}
