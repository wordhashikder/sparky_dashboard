import {
  useIsMutating,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { ExternalLink, ImageOff, Search, Upload } from "lucide-react";
import { type FormEvent, useId, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Drawer } from "@/components/ui/drawer";
import { Field, Input, Textarea } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, ErrorState, PageLoader } from "@/components/ui/states";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api";
import { config, siteLinks } from "@/lib/config";
import { adminApi } from "@/lib/endpoints";
import { directoryColumnLabels } from "@/lib/labels";
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

export default function LocationsPage() {
  const query = useQuery({ queryKey: KEY, queryFn: adminApi.locations });
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (query.data ?? []).filter(
      (location) =>
        !term ||
        location.name.toLowerCase().includes(term) ||
        location.region.toLowerCase().includes(term),
    );
  }, [query.data, search]);
  const current = query.data?.find((location) => location.slug === editing);

  return (
    <>
      <PageHeader
        title="SEO & Locations"
        description="The town and city pages: their introduction, photo and how they appear in Google. The directory order is fixed in the site's data file."
      />
      <Card>
        <div className="border-b border-line p-4">
          <div className="relative max-w-md">
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
          <ErrorState
            error={query.error}
            onRetry={() => void query.refetch()}
          />
        ) : filtered.length === 0 ? (
          <EmptyState title="No locations found" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Location</Th>
                <Th>Installers</Th>
                <Th>Directory</Th>
                <Th>Search snippet</Th>
                <Th>Photo</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((location) => (
                <Tr key={location.slug}>
                  <Td>
                    <button
                      type="button"
                      onClick={() => setEditing(location.slug)}
                      className="cursor-pointer font-medium text-primary hover:underline"
                    >
                      {location.name}
                    </button>
                    <p className="text-xs">{location.region}</p>
                  </Td>
                  <Td>{location.installer_count}</Td>
                  <Td>
                    {location.directory_column
                      ? `${directoryColumnLabels[location.directory_column]} #${location.directory_position}`
                      : "—"}
                  </Td>
                  <Td>
                    {location.seo_title || location.seo_description ? (
                      <Badge tone="green">Custom</Badge>
                    ) : (
                      <Badge>Standard</Badge>
                    )}
                  </Td>
                  <Td>
                    {location.image_url ? (
                      <img
                        src={imageSrc(location.image_url)}
                        alt=""
                        className="h-10 w-16 rounded object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <span className="text-xs">Map</span>
                    )}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
      <LocationDrawer location={current} onClose={() => setEditing(null)} />
    </>
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
        <LocationForm key={location.slug} location={location} />
      ) : null}
    </Drawer>
  );
}

function LocationForm({ location }: { location: AdminLocation }) {
  const id = useId();
  const queryClient = useQueryClient();
  const toast = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [title, setTitle] = useState(location.seo_title ?? "");
  const [description, setDescription] = useState(
    location.seo_description ?? "",
  );

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
      merge(updated);
      setErrors({});
      toast.success(
        "Saved. The public page shows the change within about 5 minutes.",
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
    save.mutate({
      intro: value("intro"),
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
      <a
        href={siteLinks.location(location.slug)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-primary hover:underline"
      >
        View the page
        <ExternalLink aria-hidden className="size-3.5" />
      </a>

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
        <h3 className="text-[13px] font-semibold">Introduction</h3>
        <Field
          label="Intro text"
          htmlFor={`${id}-intro`}
          error={errors.intro}
          hint="Shown near the top of the page. Leave blank for the standard introduction."
        >
          <Textarea
            id={`${id}-intro`}
            name="intro"
            rows={5}
            maxLength={4000}
            defaultValue={location.intro ?? ""}
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
          hint="An https:// address or a site path such as /images/locations/leeds.jpg. Uploading sets this for you."
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
    </form>
  );
}
