import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, ImagePlus, Trash2, Upload } from "lucide-react";
import { type FormEvent, type ReactNode, useRef, useState } from "react";
import { ChangePasswordCard } from "@/components/account/change-password";
import { UpgradeCard } from "@/components/installer/upgrade-card";
import { Badge, statusTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Checkbox, Field, Input, Notice, Textarea } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorState, PageLoader } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api";
import { siteLinks } from "@/lib/config";
import { installerApi } from "@/lib/endpoints";
import { formatDate } from "@/lib/format";
import {
  accreditationLabels,
  installerStatusLabels,
  planLabels,
  serviceLabels,
  subscriptionLabels,
} from "@/lib/labels";
import type {
  AccreditationScheme,
  InstallerProfile,
  InstallerUpdate,
  ServiceKey,
} from "@/lib/types";

const PROFILE_KEY = ["installer", "profile"];

export default function ProfilePage() {
  const query = useQuery({
    queryKey: PROFILE_KEY,
    queryFn: installerApi.profile,
  });
  if (query.isPending) return <PageLoader />;
  if (query.isError)
    return (
      <ErrorState error={query.error} onRetry={() => void query.refetch()} />
    );
  const profile = query.data;

  return (
    <>
      <PageHeader
        title="Profile settings"
        description="What homeowners see on your public profile, your membership and your sign-in."
        actions={
          <a
            href={siteLinks.installer(profile.slug)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-line bg-white px-4 text-sm font-semibold text-ink hover:border-ink/30"
          >
            View public profile
            <ExternalLink aria-hidden className="size-4" />
          </a>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <BusinessDetails profile={profile} />
          <AboutCard profile={profile} />
          <ServicesCard profile={profile} />
          <AccreditationsCard profile={profile} />
          <MediaCard profile={profile} />
        </div>
        <div className="space-y-6">
          <MembershipCard profile={profile} />
          <ChangePasswordCard />
        </div>
      </div>
    </>
  );
}

/** Saves a partial update, showing field errors next to their inputs. */
function useSave(onSaved?: () => void) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const mutation = useMutation({
    mutationFn: (body: InstallerUpdate) => installerApi.updateProfile(body),
    onSuccess: (profile) => {
      queryClient.setQueryData(PROFILE_KEY, profile);
      setErrors({});
      toast.success("Saved.");
      onSaved?.();
    },
    onError: (error) => {
      if (error instanceof ApiError && error.fields) setErrors(error.fields);
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Couldn't save your changes.",
      );
    },
  });
  return { save: mutation.mutate, saving: mutation.isPending, errors };
}

function text(form: FormData, name: string) {
  return String(form.get(name) ?? "").trim();
}

function Section({
  title,
  description,
  onSubmit,
  saving,
  children,
}: {
  title: string;
  description?: string;
  onSubmit: (form: FormData) => void;
  saving: boolean;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader title={title} description={description} />
      <CardBody>
        <form
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            onSubmit(new FormData(event.currentTarget));
          }}
          className="space-y-4"
          noValidate
        >
          {children}
          <div className="pt-1">
            <Button type="submit" loading={saving}>
              Save changes
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}

function BusinessDetails({ profile }: { profile: InstallerProfile }) {
  const { save, saving, errors } = useSave();
  return (
    <Section
      title="Business details"
      description="Your trading name, contact details and where you're based."
      saving={saving}
      onSubmit={(form) =>
        save({
          business_name: text(form, "business_name"),
          contact_name: text(form, "contact_name"),
          phone: text(form, "phone"),
          website_url: text(form, "website_url") || null,
          company_number: text(form, "company_number") || null,
          base_postcode: text(form, "base_postcode"),
          coverage_radius_miles: Number(form.get("coverage_radius_miles")),
          years_experience: text(form, "years_experience")
            ? Number(form.get("years_experience"))
            : null,
        })
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Business name"
          htmlFor="business_name"
          error={errors.business_name}
        >
          <Input
            id="business_name"
            name="business_name"
            defaultValue={profile.business_name}
            maxLength={120}
          />
        </Field>
        <Field
          label="Contact name"
          htmlFor="contact_name"
          error={errors.contact_name}
        >
          <Input
            id="contact_name"
            name="contact_name"
            defaultValue={profile.contact_name}
            maxLength={80}
          />
        </Field>
        <Field label="Phone" htmlFor="phone" error={errors.phone}>
          <Input
            id="phone"
            name="phone"
            type="tel"
            defaultValue={profile.phone}
          />
        </Field>
        <Field
          label="Website (optional)"
          htmlFor="website_url"
          error={errors.website_url}
        >
          <Input
            id="website_url"
            name="website_url"
            type="url"
            defaultValue={profile.website_url ?? ""}
            placeholder="https://"
          />
        </Field>
        <Field
          label="Base postcode"
          htmlFor="base_postcode"
          error={errors.base_postcode}
          hint="Where your service area is measured from."
        >
          <Input
            id="base_postcode"
            name="base_postcode"
            defaultValue={profile.base_postcode}
            className="uppercase"
          />
        </Field>
        <Field
          label="Service radius (miles)"
          htmlFor="coverage_radius_miles"
          error={errors.coverage_radius_miles}
        >
          <Input
            id="coverage_radius_miles"
            name="coverage_radius_miles"
            type="number"
            min={1}
            max={100}
            defaultValue={profile.coverage_radius_miles}
          />
        </Field>
        <Field
          label="Companies House number (optional)"
          htmlFor="company_number"
          error={errors.company_number}
        >
          <Input
            id="company_number"
            name="company_number"
            defaultValue={profile.company_number ?? ""}
            className="uppercase"
            maxLength={8}
          />
        </Field>
        <Field
          label="Years of experience (optional)"
          htmlFor="years_experience"
          error={errors.years_experience}
        >
          <Input
            id="years_experience"
            name="years_experience"
            type="number"
            min={0}
            max={80}
            defaultValue={profile.years_experience ?? ""}
          />
        </Field>
      </div>
    </Section>
  );
}

function AboutCard({ profile }: { profile: InstallerProfile }) {
  const { save, saving, errors } = useSave();
  const [tagline, setTagline] = useState(profile.tagline ?? "");
  return (
    <Section
      title="About your business"
      description="Shown at the top of your profile and in search results."
      saving={saving}
      onSubmit={(form) =>
        save({
          tagline: text(form, "tagline") || null,
          description: text(form, "description") || null,
        })
      }
    >
      <Field
        label="Tagline"
        htmlFor="tagline"
        error={errors.tagline}
        aside={`${tagline.length}/120`}
      >
        <Input
          id="tagline"
          name="tagline"
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
          maxLength={120}
        />
      </Field>
      <Field
        label="Description"
        htmlFor="description"
        error={errors.description}
      >
        <Textarea
          id="description"
          name="description"
          rows={7}
          defaultValue={profile.description ?? ""}
          maxLength={4000}
        />
      </Field>
    </Section>
  );
}

function ServicesCard({ profile }: { profile: InstallerProfile }) {
  const { save, saving, errors } = useSave();
  return (
    <Section
      title="Services and areas"
      description="The work you do and the towns you cover."
      saving={saving}
      onSubmit={(form) =>
        save({
          services: form.getAll("services").map(String) as ServiceKey[],
          areas_covered: text(form, "areas_covered")
            .split(",")
            .map((area) => area.trim())
            .filter(Boolean),
        })
      }
    >
      <fieldset>
        <legend className="mb-2 text-[13px] font-semibold text-ink">
          Services
        </legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {(Object.keys(serviceLabels) as ServiceKey[]).map((key) => (
            <Checkbox
              key={key}
              name="services"
              value={key}
              defaultChecked={profile.services.includes(key)}
              label={serviceLabels[key]}
            />
          ))}
        </div>
        {errors.services ? (
          <p className="mt-1.5 text-xs text-red-600">{errors.services}</p>
        ) : null}
        {profile.plan === "free" ? (
          <p className="mt-2 text-xs text-subtle">
            The Free plan shows your first two services publicly.
          </p>
        ) : null}
      </fieldset>
      <Field
        label="Areas covered"
        htmlFor="areas_covered"
        error={errors.areas_covered}
        hint="Separate towns with commas, e.g. Manchester, Salford, Stockport (up to 20)."
      >
        <Input
          id="areas_covered"
          name="areas_covered"
          defaultValue={profile.areas_covered.join(", ")}
        />
      </Field>
    </Section>
  );
}

function AccreditationsCard({ profile }: { profile: InstallerProfile }) {
  const { save, saving, errors } = useSave();
  const held = new Map(
    profile.accreditations.map((item) => [item.scheme, item]),
  );
  return (
    <Section
      title="Accreditations"
      description="Tick the schemes you belong to. The PickASparky team verifies each one."
      saving={saving}
      onSubmit={(form) =>
        save({
          accreditations: (
            Object.keys(accreditationLabels) as AccreditationScheme[]
          )
            .filter((scheme) => form.get(`acc-${scheme}`) === "on")
            .map((scheme) => ({
              scheme,
              registration_number: text(form, `reg-${scheme}`) || null,
            })),
        })
      }
    >
      {errors.accreditations ? (
        <Notice tone="error">{errors.accreditations}</Notice>
      ) : null}
      <div className="divide-y divide-line rounded-xl border border-line">
        {(Object.keys(accreditationLabels) as AccreditationScheme[]).map(
          (scheme) => {
            const item = held.get(scheme);
            return (
              <div
                key={scheme}
                className="flex flex-wrap items-center gap-3 px-4 py-3"
              >
                <Checkbox
                  name={`acc-${scheme}`}
                  defaultChecked={!!item}
                  label={accreditationLabels[scheme]}
                  className="w-32"
                />
                <label className="sr-only" htmlFor={`reg-${scheme}`}>
                  {accreditationLabels[scheme]} registration number
                </label>
                <Input
                  id={`reg-${scheme}`}
                  name={`reg-${scheme}`}
                  defaultValue={item?.registration_number ?? ""}
                  placeholder="Registration number (optional)"
                  className="h-9 max-w-64 flex-1"
                  maxLength={60}
                />
                {item ? (
                  <Badge tone={item.verified ? "green" : "amber"}>
                    {item.verified ? "Verified" : "Awaiting check"}
                  </Badge>
                ) : null}
              </div>
            );
          },
        )}
      </div>
    </Section>
  );
}

function MediaCard({ profile }: { profile: InstallerProfile }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const logoInput = useRef<HTMLInputElement>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const onError = (error: unknown) =>
    toast.error(error instanceof ApiError ? error.message : "Upload failed.");
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: PROFILE_KEY });

  const logo = useMutation({
    mutationFn: installerApi.uploadLogo,
    onSuccess: (updated) => {
      queryClient.setQueryData(PROFILE_KEY, updated);
      toast.success("Logo updated.");
    },
    onError,
  });
  const photo = useMutation({
    mutationFn: (file: File) =>
      installerApi.uploadPhoto(file, `${profile.business_name} installation`),
    onSuccess: () => {
      void refresh();
      toast.success("Photo added.");
    },
    onError,
  });
  const remove = useMutation({
    mutationFn: installerApi.deletePhoto,
    onSuccess: () => {
      void refresh();
      toast.success("Photo removed.");
    },
    onError,
  });

  const accept = "image/jpeg,image/png,image/webp";
  return (
    <Card>
      <CardHeader
        title="Logo and photos"
        description="JPEG, PNG or WebP, up to 5 MB each."
      />
      <CardBody className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="flex size-20 items-center justify-center overflow-hidden rounded-xl border border-line bg-surface">
            {profile.logo_url ? (
              <img
                src={profile.logo_url}
                alt=""
                className="size-full object-contain"
              />
            ) : (
              <ImagePlus aria-hidden className="size-6 text-subtle" />
            )}
          </div>
          <input
            ref={logoInput}
            type="file"
            accept={accept}
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) logo.mutate(file);
              event.target.value = "";
            }}
          />
          <Button
            variant="outline"
            loading={logo.isPending}
            onClick={() => logoInput.current?.click()}
            icon={<Upload aria-hidden className="size-4" />}
          >
            {profile.logo_url ? "Replace logo" : "Upload logo"}
          </Button>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[13px] font-semibold">Gallery</h3>
            <input
              ref={photoInput}
              type="file"
              accept={accept}
              className="sr-only"
              tabIndex={-1}
              aria-hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) photo.mutate(file);
                event.target.value = "";
              }}
            />
            <Button
              size="sm"
              variant="outline"
              loading={photo.isPending}
              disabled={profile.plan === "free"}
              onClick={() => photoInput.current?.click()}
              icon={<ImagePlus aria-hidden className="size-4" />}
            >
              Add photo
            </Button>
          </div>
          {profile.plan === "free" ? (
            <p className="text-xs text-subtle">
              Gallery photos are part of the Pro and Premium plans.
            </p>
          ) : profile.photos.length === 0 ? (
            <p className="text-sm">
              No photos yet. Show homeowners your best installations.
            </p>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {profile.photos.map((item) => (
                <li
                  key={item.id}
                  className="group relative overflow-hidden rounded-lg border border-line"
                >
                  <img
                    src={item.url}
                    alt={item.alt ?? ""}
                    className="aspect-[4/3] w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm("Remove this photo?"))
                        remove.mutate(item.id);
                    }}
                    className="absolute top-2 right-2 cursor-pointer rounded-md bg-white/90 p-1.5 text-red-600 shadow-soft hover:bg-white"
                    aria-label="Remove photo"
                  >
                    <Trash2 aria-hidden className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

function MembershipCard({ profile }: { profile: InstallerProfile }) {
  const toast = useToast();
  const portal = useMutation({
    mutationFn: installerApi.billingPortal,
    onSuccess: ({ url }) => window.location.assign(url),
    onError: (error) =>
      toast.error(
        error instanceof ApiError ? error.message : "Couldn't open billing.",
      ),
  });
  return (
    <>
      <Card>
        <CardHeader title="Membership" />
        <CardBody className="space-y-3 text-sm">
          <Row label="Plan">
            <Badge tone={statusTone[profile.plan]}>
              {planLabels[profile.plan]}
            </Badge>
          </Row>
          <Row label="Listing">
            <Badge tone={statusTone[profile.status]}>
              {installerStatusLabels[profile.status]}
            </Badge>
          </Row>
          <Row label="Subscription">
            {subscriptionLabels[profile.subscription_status]}
          </Row>
          {profile.current_period_end ? (
            <Row label="Renews">{formatDate(profile.current_period_end)}</Row>
          ) : null}
          {profile.subscription_status !== "none" ? (
            <Button
              variant="outline"
              className="mt-2 w-full"
              loading={portal.isPending}
              onClick={() => portal.mutate()}
            >
              Manage billing
            </Button>
          ) : null}
        </CardBody>
      </Card>
      {profile.plan === "free" ? <UpgradeCard compact /> : null}
    </>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span>{label}</span>
      <span className="text-ink">{children}</span>
    </div>
  );
}
