import {
  useIsMutating,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  ExternalLink,
  ImageOff,
  MapPin,
  Plus,
  Search,
  Upload,
} from "lucide-react";
import { type FormEvent, useId, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Drawer } from "@/components/ui/drawer";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, ErrorState, PageLoader } from "@/components/ui/states";
import { Tabs } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api";
import { config, siteLinks } from "@/lib/config";
import { adminApi } from "@/lib/endpoints";
import { formatDate } from "@/lib/format";
import type { AdminLocation, AdminLocationUpdate } from "@/lib/types";

const KEY = ["admin", "locations"];
const LOCATION_FORM = "location-form";

/** The page's standard wording when no override is set (see the frontend's location-data.ts). */
function defaultTitle(location: AdminLocation) {
  return `EV Charger Installers in ${location.name} | PickASparky`;
}
function defaultDescription(location: AdminLocation) {
  return `Compare up to 5 free quotes from vetted EV charger installers in ${location.name}. Enter your postcode, see trusted local electricians and choose who to contact.`;
}

type Filter = "all" | "live" | "draft";

export default function LocationsPage() {
  const query = useQuery({ queryKey: KEY, queryFn: adminApi.locations });
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [creating, setCreating] = useState(false);
  const editing = params.get("open");
  const setEditing = (slug: string | null) => {
    const copy = new URLSearchParams(params);
    if (slug) copy.set("open", slug);
    else copy.delete("open");
    setParams(copy, { replace: true });
  };
  const all = query.data ?? [];
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return all.filter(
      (location) =>
        (filter === "all" ||
          (filter === "live"
            ? location.is_published
            : !location.is_published)) &&
        (!term ||
          location.name.toLowerCase().includes(term) ||
          location.region.toLowerCase().includes(term) ||
          location.slug.includes(term)),
    );
  }, [all, search, filter]);
  const current = all.find((location) => location.slug === editing);
  const drafts = all.filter((location) => !location.is_published).length;

  return (
    <>
      <PageHeader
        title="SEO & Locations"
        description="The town and city pages: their heading, text, photo and how they appear in Google. New pages start as drafts until you publish them."
        actions={
          <Button
            onClick={() => setCreating(true)}
            icon={<Plus aria-hidden className="size-4" />}
          >
            New location page
          </Button>
        }
      />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Tabs
          label="Show"
          value={filter}
          onChange={setFilter}
          tabs={[
            { value: "all", label: "All pages", count: all.length },
            { value: "live", label: "Live", count: all.length - drafts },
            { value: "draft", label: "Drafts", count: drafts },
          ]}
        />
        <div className="relative mb-5 w-full max-w-xs">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle"
          />
          <label htmlFor="location-search" className="sr-only">
            Search locations
          </label>
          <Input
            id="location-search"
            type="search"
            placeholder="Town or region"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-9"
          />
        </div>
      </div>
      {query.isPending ? (
        <PageLoader />
      ) : query.isError ? (
        <Card>
          <ErrorState
            error={query.error}
            onRetry={() => void query.refetch()}
          />
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState title="No location pages found" />
        </Card>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filtered.map((location) => (
            <li key={location.slug}>
              <LocationCard
                location={location}
                onEdit={() => setEditing(location.slug)}
              />
            </li>
          ))}
        </ul>
      )}
      <LocationDrawer location={current} onClose={() => setEditing(null)} />
      <NewLocationDrawer
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(slug) => {
          setCreating(false);
          setEditing(slug);
        }}
      />
    </>
  );
}

function LocationCard({
  location,
  onEdit,
}: {
  location: AdminLocation;
  onEdit: () => void;
}) {
  const custom = location.seo_title || location.seo_description;
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-soft">
      <button
        type="button"
        onClick={onEdit}
        className="relative block aspect-[16/9] cursor-pointer bg-mint-soft"
        aria-label={`Edit ${location.name}`}
      >
        {location.image_url ? (
          <img
            src={imageSrc(location.image_url)}
            alt=""
            className="size-full object-cover"
            loading="lazy"
            onError={(event) => {
              event.currentTarget.style.visibility = "hidden";
            }}
          />
        ) : (
          <span className="flex size-full items-center justify-center text-primary">
            <MapPin aria-hidden className="size-8" strokeWidth={1.5} />
          </span>
        )}
        <span className="absolute top-3 left-3">
          <Badge tone={location.is_published ? "green" : "amber"}>
            {location.is_published ? "Live" : "Draft"}
          </Badge>
        </span>
      </button>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="truncate text-[15px] font-semibold">
              {location.name}
            </h2>
            <p className="truncate text-xs text-subtle">
              {location.region} · /{location.slug}/
            </p>
          </div>
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg bg-canvas px-2.5 py-2">
            <dt className="text-subtle">Installers</dt>
            <dd className="text-sm font-semibold text-ink">
              {location.installer_count}
            </dd>
          </div>
          <div className="rounded-lg bg-canvas px-2.5 py-2">
            <dt className="text-subtle">Search snippet</dt>
            <dd className="text-sm font-semibold text-ink">
              {custom ? "Custom" : "Standard"}
            </dd>
          </div>
        </dl>
        <div className="mt-auto flex items-center justify-between gap-2 pt-4">
          <span className="text-xs text-subtle">
            {location.updated_at
              ? `Updated ${formatDate(location.updated_at)}`
              : ""}
          </span>
          <div className="flex items-center gap-1">
            {location.is_published ? (
              <a
                href={siteLinks.location(location.slug)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex size-8 items-center justify-center rounded-md text-ink hover:bg-ink/5"
                aria-label={`View the ${location.name} page`}
              >
                <ExternalLink aria-hidden className="size-4" />
              </a>
            ) : null}
            <Button variant="outline" size="sm" onClick={onEdit}>
              Edit
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}

function NewLocationDrawer({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (slug: string) => void;
}) {
  const id = useId();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const create = useMutation({
    mutationFn: adminApi.createLocation,
    onSuccess: (location) => {
      void queryClient.invalidateQueries({ queryKey: KEY });
      setErrors({});
      toast.success(
        location.is_published
          ? `${location.name} is live.`
          : `${location.name} saved as a draft. Add its text, then publish it.`,
      );
      onCreated(location.slug);
    },
    onError: (error) => {
      if (error instanceof ApiError && error.fields) setErrors(error.fields);
      else
        toast.error(
          error instanceof ApiError
            ? error.message
            : "Couldn't create the page.",
        );
    },
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const value = (name: string) => String(form.get(name) ?? "").trim();
    create.mutate({
      name: value("name"),
      postcode: value("postcode"),
      region: value("region") || null,
      slug: value("slug") || null,
      is_published: form.get("is_published") === "on",
    });
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="New location page"
      description="A page for a town or city at /uk/ev-charger-installers/<address>/."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={`${id}-form`} loading={create.isPending}>
            Create page
          </Button>
        </>
      }
    >
      <form
        id={`${id}-form`}
        onSubmit={onSubmit}
        className="space-y-4"
        noValidate
      >
        <Field label="Town or city" htmlFor={`${id}-name`} error={errors.name}>
          <Input id={`${id}-name`} name="name" required maxLength={80} />
        </Field>
        <Field
          label="A postcode near the centre"
          htmlFor={`${id}-postcode`}
          error={errors.postcode}
          hint="Places the page on the map and finds the installers who cover it."
        >
          <Input id={`${id}-postcode`} name="postcode" required />
        </Field>
        <Field
          label="Region"
          htmlFor={`${id}-region`}
          error={errors.region}
          hint="Leave blank to use the postcode's region."
        >
          <Input id={`${id}-region`} name="region" maxLength={80} />
        </Field>
        <Field
          label="Page address"
          htmlFor={`${id}-slug`}
          error={errors.slug}
          hint="Leave blank to use the name, e.g. st-albans. It can change only while the page is a draft."
        >
          <Input
            id={`${id}-slug`}
            name="slug"
            maxLength={80}
            placeholder="st-albans"
          />
        </Field>
        <Checkbox name="is_published" label="Publish straight away" />
      </form>
    </Drawer>
  );
}

/** Bundled photos are site paths; show them from the public site. */
function imageSrc(url: string) {
  return url.startsWith("/") ? `${config.siteUrl}${url}` : url;
}

function LocationDrawer({
  location,
  onClose,
}: {
  location: AdminLocation | undefined;
  onClose: () => void;
}) {
  const [params, setParams] = useSearchParams();
  const onRenamed = (slug: string) => {
    const copy = new URLSearchParams(params);
    copy.set("open", slug);
    setParams(copy, { replace: true });
  };
  const saving = useIsMutating({ mutationKey: ["save-location"] });
  return (
    <Drawer
      open={!!location}
      onClose={onClose}
      wide
      title={location ? location.name : ""}
      description={location?.region}
      footer={
        <Button type="submit" form={LOCATION_FORM} loading={saving > 0}>
          Save changes
        </Button>
      }
    >
      {location ? (
        <LocationForm
          key={location.slug}
          location={location}
          onRenamed={onRenamed}
          onDeleted={onClose}
        />
      ) : null}
    </Drawer>
  );
}

function LocationForm({
  location,
  onRenamed,
  onDeleted,
}: {
  location: AdminLocation;
  onRenamed: (slug: string) => void;
  onDeleted: () => void;
}) {
  const id = useId();
  const queryClient = useQueryClient();
  const toast = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [title, setTitle] = useState(location.seo_title ?? "");
  const [description, setDescription] = useState(
    location.seo_description ?? "",
  );
  const [intro, setIntro] = useState(location.intro ?? "");
  const [extraBody, setExtraBody] = useState(location.extra_body ?? "");

  const merge = (updated: AdminLocation) =>
    queryClient.setQueryData<AdminLocation[]>(KEY, (list) =>
      list?.map((item) =>
        item.slug === updated.slug
          ? { ...updated, installer_count: item.installer_count }
          : item,
      ),
    );
  const onError = (error: unknown) => {
    if (error instanceof ApiError && error.fields) setErrors(error.fields);
    toast.error(error instanceof ApiError ? error.message : "Couldn't save.");
  };

  const save = useMutation({
    mutationKey: ["save-location"],
    mutationFn: (body: AdminLocationUpdate) =>
      adminApi.updateLocation(location.slug, body),
    onSuccess: (updated) => {
      if (updated.slug !== location.slug) {
        void queryClient.invalidateQueries({ queryKey: KEY });
        onRenamed(updated.slug);
      } else merge(updated);
      setErrors({});
      toast.success(
        updated.is_published
          ? "Saved. The public page shows the change now."
          : "Saved as a draft.",
      );
    },
    onError,
  });
  const publish = useMutation({
    mutationFn: (is_published: boolean) =>
      adminApi.updateLocation(location.slug, { is_published }),
    onSuccess: (updated) => {
      merge(updated);
      toast.success(
        updated.is_published
          ? `${updated.name} is live on the website.`
          : `${updated.name} is now a draft and hidden from the website.`,
      );
    },
    onError,
  });
  const upload = useMutation({
    mutationFn: (file: File) =>
      adminApi.uploadLocationImage(
        location.slug,
        file,
        location.image_alt ?? "",
        location.image_credit ?? "",
      ),
    onSuccess: (updated) => {
      merge(updated);
      toast.success("Photo uploaded.");
    },
    onError,
  });
  const remove = useMutation({
    mutationFn: () => adminApi.deleteLocation(location.slug),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: KEY });
      toast.success(`${location.name} deleted.`);
      onDeleted();
    },
    onError,
  });
  const removeImage = useMutation({
    mutationFn: () => adminApi.removeLocationImage(location.slug),
    onSuccess: (updated) => {
      merge(updated);
      toast.success("Photo removed: the page shows its local map instead.");
    },
    onError,
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const value = (name: string) => String(form.get(name) ?? "").trim() || null;
    const slug = String(form.get("slug") ?? "").trim();
    save.mutate({
      name: String(form.get("name") ?? "").trim(),
      region: String(form.get("region") ?? "").trim(),
      ...(slug && slug !== location.slug ? { slug } : {}),
      h1_heading: value("h1_heading"),
      intro: value("intro"),
      extra_title: value("extra_title"),
      extra_body: value("extra_body"),
      seo_title: value("seo_title"),
      seo_description: value("seo_description"),
      image_url: value("image_url"),
      image_alt: value("image_alt"),
      image_credit: value("image_credit"),
    });
  }

  const shownTitle = title.trim() || defaultTitle(location);
  const shownDescription = description.trim() || defaultDescription(location);

  return (
    <form
      id={LOCATION_FORM}
      onSubmit={onSubmit}
      className="space-y-6"
      noValidate
    >
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3">
        <div className="flex items-center gap-2">
          <Badge tone={location.is_published ? "green" : "amber"}>
            {location.is_published ? "Live" : "Draft"}
          </Badge>
          <span className="text-[13px]">
            {location.is_published
              ? "Shown on the website, the directory and the sitemap."
              : "Hidden from the website until you publish it."}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {location.is_published ? (
            <a
              href={siteLinks.location(location.slug)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-primary hover:underline"
            >
              View page <ExternalLink aria-hidden className="size-3.5" />
            </a>
          ) : null}
          <Button
            size="sm"
            variant={location.is_published ? "outline" : "primary"}
            loading={publish.isPending}
            onClick={() => {
              if (
                !location.is_published ||
                window.confirm(
                  `Unpublish ${location.name}? Its page will disappear from the website.`,
                )
              )
                publish.mutate(!location.is_published);
            }}
          >
            {location.is_published ? "Unpublish" : "Publish"}
          </Button>
        </div>
      </div>

      <section className="space-y-4">
        <h3 className="text-[13px] font-semibold">Page</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Town or city"
            htmlFor={`${id}-name`}
            error={errors.name}
          >
            <Input
              id={`${id}-name`}
              name="name"
              defaultValue={location.name}
              maxLength={80}
            />
          </Field>
          <Field label="Region" htmlFor={`${id}-region`} error={errors.region}>
            <Input
              id={`${id}-region`}
              name="region"
              defaultValue={location.region}
              maxLength={80}
            />
          </Field>
        </div>
        <Field
          label="Page address"
          htmlFor={`${id}-slug`}
          error={errors.slug}
          hint={
            location.is_published
              ? "Unpublish the page to change its address, so links and search results never break."
              : "Lowercase letters, numbers and hyphens."
          }
        >
          <Input
            id={`${id}-slug`}
            name="slug"
            defaultValue={location.slug}
            disabled={location.is_published}
            maxLength={80}
          />
        </Field>
        <Field
          label="Main heading (H1)"
          htmlFor={`${id}-h1`}
          error={errors.h1_heading}
          hint={`Leave blank for the standard heading: "Find trusted EV charger installers in ${location.name}".`}
        >
          <Input
            id={`${id}-h1`}
            name="h1_heading"
            maxLength={120}
            defaultValue={location.h1_heading ?? ""}
            placeholder={`EV charger installers in ${location.name}`}
          />
        </Field>
      </section>

      <section className="space-y-4">
        <h3 className="text-[13px] font-semibold">Search appearance</h3>
        <div className="rounded-xl border border-line bg-white p-4">
          <p className="text-xs text-[#1a7f37]">
            {siteLinks.location(location.slug).replace(/^https?:\/\//, "")}
          </p>
          <p className="mt-1 truncate text-lg text-[#1a0dab]">{shownTitle}</p>
          <p className="mt-1 line-clamp-2 text-[13px] text-[#4d5156]">
            {shownDescription}
          </p>
        </div>
        <Field
          label="SEO title"
          htmlFor={`${id}-title`}
          error={errors.seo_title}
          aside={`${title.length}/70`}
          hint="Leave blank to use the standard title. Shown as written (the brand is not added)."
        >
          <Input
            id={`${id}-title`}
            name="seo_title"
            value={title}
            maxLength={70}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={defaultTitle(location)}
          />
        </Field>
        <Field
          label="Meta description"
          htmlFor={`${id}-description`}
          error={errors.seo_description}
          aside={`${description.length}/160`}
          hint="Leave blank to use the standard description."
        >
          <Textarea
            id={`${id}-description`}
            name="seo_description"
            rows={3}
            value={description}
            maxLength={160}
            onChange={(event) => setDescription(event.target.value)}
            placeholder={defaultDescription(location)}
          />
        </Field>
      </section>

      <section className="space-y-4">
        <h3 className="text-[13px] font-semibold">Page text</h3>
        <Field
          label="About EV charging in this town"
          htmlFor={`${id}-intro`}
          error={errors.intro}
          aside={`${intro.length.toLocaleString("en-GB")}/20,000`}
          hint="Markdown: ## headings, **bold**, - bullet lists and [links](/page/). Leave blank for the standard text from Website content › Location pages."
        >
          <Textarea
            id={`${id}-intro`}
            name="intro"
            rows={12}
            maxLength={20000}
            value={intro}
            onChange={(event) => setIntro(event.target.value)}
            className="font-mono text-[13px]"
          />
        </Field>
      </section>

      <section className="space-y-4">
        <h3 className="text-[13px] font-semibold">
          Closing section (optional)
        </h3>
        <p className="text-[13px]">
          A section for this town only, shown below the reviews and above “Find
          trusted installers in your area”. Leave both fields empty to use the
          standard one from Website content › Location pages (hidden unless it
          has text).
        </p>
        <Field
          label="Title"
          htmlFor={`${id}-extra-title`}
          error={errors.extra_title}
        >
          <Input
            id={`${id}-extra-title`}
            name="extra_title"
            maxLength={120}
            defaultValue={location.extra_title ?? ""}
          />
        </Field>
        <Field
          label="Text"
          htmlFor={`${id}-extra-body`}
          error={errors.extra_body}
          aside={`${extraBody.length.toLocaleString("en-GB")}/20,000`}
          hint="Markdown: ## headings, **bold**, - bullet lists and [links](/page/)."
        >
          <Textarea
            id={`${id}-extra-body`}
            name="extra_body"
            rows={8}
            maxLength={20000}
            value={extraBody}
            onChange={(event) => setExtraBody(event.target.value)}
            className="font-mono text-[13px]"
          />
        </Field>
      </section>

      <section className="space-y-4">
        <h3 className="text-[13px] font-semibold">Photo</h3>
        <div className="flex flex-wrap items-center gap-4">
          {location.image_url ? (
            <img
              src={imageSrc(location.image_url)}
              alt=""
              className="h-24 w-40 rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-24 w-40 items-center justify-center rounded-lg border border-dashed border-line text-xs">
              Local map shown
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileInput}
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
              onClick={() => fileInput.current?.click()}
              icon={<Upload aria-hidden className="size-4" />}
            >
              Upload photo
            </Button>
            {location.image_url ? (
              <Button
                variant="ghost"
                size="sm"
                loading={removeImage.isPending}
                onClick={() => {
                  if (window.confirm("Remove the photo?")) removeImage.mutate();
                }}
                icon={<ImageOff aria-hidden className="size-4" />}
              >
                Remove
              </Button>
            ) : null}
          </div>
        </div>
        <Field
          label="Photo address"
          htmlFor={`${id}-image`}
          error={errors.image_url}
          hint="A site path such as /images/locations/leeds.jpg, or an uploaded image. Uploading sets this for you."
        >
          <Input
            id={`${id}-image`}
            name="image_url"
            defaultValue={location.image_url ?? ""}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Alt text"
            htmlFor={`${id}-alt`}
            error={errors.image_alt}
          >
            <Input
              id={`${id}-alt`}
              name="image_alt"
              maxLength={160}
              defaultValue={location.image_alt ?? ""}
            />
          </Field>
          <Field
            label="Credit"
            htmlFor={`${id}-credit`}
            error={errors.image_credit}
          >
            <Input
              id={`${id}-credit`}
              name="image_credit"
              maxLength={160}
              defaultValue={location.image_credit ?? ""}
              placeholder="Photo: Jane Doe"
            />
          </Field>
        </div>
      </section>

      <section className="space-y-2 rounded-xl border border-red-200 bg-red-50/50 p-4">
        <h3 className="text-[13px] font-semibold text-red-700">
          Delete this page
        </h3>
        <p className="text-[13px]">
          {location.is_published
            ? "Unpublish the page first. A live page can't be deleted."
            : location.installer_count > 0
              ? "Installers are placed in this town. Move or delete them first, or keep the page as a draft."
              : "Removes the page for good."}
        </p>
        <Button
          variant="danger"
          size="sm"
          disabled={location.is_published || location.installer_count > 0}
          loading={remove.isPending}
          onClick={() => {
            if (
              window.confirm(
                `Delete the ${location.name} page? This cannot be undone.`,
              )
            )
              remove.mutate();
          }}
        >
          Delete page
        </Button>
      </section>
    </form>
  );
}
