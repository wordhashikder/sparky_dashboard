import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Download, FileUp, Plus } from "lucide-react";
import { type FormEvent, useId, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import {
  Checkbox,
  Field,
  Input,
  Notice,
  Select,
  Textarea,
} from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api";
import { adminApi } from "@/lib/endpoints";
import {
  accreditationLabels,
  installerStatusLabels,
  planLabels,
  serviceLabels,
} from "@/lib/labels";
import type {
  AccreditationScheme,
  AdminInstaller,
  AdminInstallerUpdate,
  ImportReport,
  InstallerStatus,
  Plan,
  ServiceKey,
} from "@/lib/types";

const SCHEMES = Object.keys(accreditationLabels) as AccreditationScheme[];
const SERVICES = Object.keys(serviceLabels) as ServiceKey[];
const text = (form: FormData, name: string) =>
  String(form.get(name) ?? "").trim();

function fieldErrors(error: unknown): Record<string, string> {
  return error instanceof ApiError && error.fields ? error.fields : {};
}

/** Add one listing by hand. It has no account until the business claims it. */
export function AddInstallerDrawer({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (installer: AdminInstaller) => void;
}) {
  const id = useId();
  const toast = useToast();
  const queryClient = useQueryClient();
  const formRef = useRef<HTMLFormElement>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const create = useMutation({
    mutationFn: adminApi.createInstaller,
    onSuccess: (installer) => {
      toast.success(`${installer.business_name} added.`);
      setErrors({});
      formRef.current?.reset();
      void queryClient.invalidateQueries({ queryKey: ["admin"] });
      onCreated(installer);
    },
    onError: (error) => {
      const fields = fieldErrors(error);
      setErrors(fields);
      if (!Object.keys(fields).length)
        toast.error(
          error instanceof ApiError
            ? error.message
            : "Couldn't add the listing.",
        );
    },
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    create.mutate({
      business_name: text(form, "business_name"),
      contact_name: text(form, "contact_name") || null,
      contact_email: text(form, "contact_email"),
      phone: text(form, "phone"),
      description: text(form, "description") || null,
      base_postcode: text(form, "base_postcode"),
      coverage_radius_miles: Number(form.get("coverage_radius_miles") || 15),
      accreditations: form.getAll("accreditations") as AccreditationScheme[],
      services: (form.getAll("services") as ServiceKey[]).length
        ? (form.getAll("services") as ServiceKey[])
        : ["ev_charger_installation"],
      status: text(form, "status") as InstallerStatus,
      plan: text(form, "plan") as Plan,
    });
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      wide
      title="Add an installer"
      description="Creates a free listing on the website. The business can claim it with the email below."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            form={`${id}-form`}
            loading={create.isPending}
            icon={<Plus aria-hidden className="size-4" />}
          >
            Add installer
          </Button>
        </>
      }
    >
      <form
        id={`${id}-form`}
        ref={formRef}
        onSubmit={onSubmit}
        className="grid gap-4 sm:grid-cols-2"
        noValidate
      >
        <Field
          label="Business name"
          htmlFor={`${id}-name`}
          error={errors.business_name}
          className="sm:col-span-2"
        >
          <Input
            id={`${id}-name`}
            name="business_name"
            required
            maxLength={120}
          />
        </Field>
        <Field
          label="Contact name"
          htmlFor={`${id}-contact`}
          error={errors.contact_name}
        >
          <Input id={`${id}-contact`} name="contact_name" maxLength={80} />
        </Field>
        <Field
          label="Email"
          htmlFor={`${id}-email`}
          error={errors.contact_email}
          hint="Used to claim the listing."
        >
          <Input
            id={`${id}-email`}
            name="contact_email"
            type="email"
            required
          />
        </Field>
        <Field label="Phone" htmlFor={`${id}-phone`} error={errors.phone}>
          <Input id={`${id}-phone`} name="phone" type="tel" required />
        </Field>
        <Field
          label="Base postcode"
          htmlFor={`${id}-postcode`}
          error={errors.base_postcode}
          hint="Places the listing on the map and its town page."
        >
          <Input id={`${id}-postcode`} name="base_postcode" required />
        </Field>
        <Field
          label="Coverage radius (miles)"
          htmlFor={`${id}-radius`}
          error={errors.coverage_radius_miles}
        >
          <Input
            id={`${id}-radius`}
            name="coverage_radius_miles"
            type="number"
            min={1}
            max={100}
            defaultValue={15}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Status" htmlFor={`${id}-status`}>
            <Select id={`${id}-status`} name="status" defaultValue="approved">
              {(["approved", "pending"] as InstallerStatus[]).map((key) => (
                <option key={key} value={key}>
                  {installerStatusLabels[key]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Plan" htmlFor={`${id}-plan`}>
            <Select id={`${id}-plan`} name="plan" defaultValue="free">
              {(Object.keys(planLabels) as Plan[]).map((key) => (
                <option key={key} value={key}>
                  {planLabels[key]}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field
          label="Description"
          htmlFor={`${id}-description`}
          error={errors.description}
          className="sm:col-span-2"
        >
          <Textarea
            id={`${id}-description`}
            name="description"
            rows={3}
            maxLength={4000}
          />
        </Field>
        <fieldset className="sm:col-span-2">
          <legend className="mb-2 text-[13px] font-semibold text-ink">
            Accreditations (shown as unverified until you check them)
          </legend>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {SCHEMES.map((scheme) => (
              <Checkbox
                key={scheme}
                name="accreditations"
                value={scheme}
                label={accreditationLabels[scheme]}
              />
            ))}
          </div>
        </fieldset>
        <fieldset className="sm:col-span-2">
          <legend className="mb-2 text-[13px] font-semibold text-ink">
            Services
          </legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {SERVICES.map((service) => (
              <Checkbox
                key={service}
                name="services"
                value={service}
                defaultChecked={service === "ev_charger_installation"}
                label={serviceLabels[service]}
              />
            ))}
          </div>
        </fieldset>
      </form>
    </Drawer>
  );
}

const TEMPLATE =
  "business_name,contact_email,phone,postcode,contact_name,accreditations,coverage_radius_miles,description\n" +
  "Bright Sparks Ltd,office@brightsparks.example,0161 496 0000,M1 1AA,Jane Smith,NICEIC; OZEV,15,Home and workplace EV charger installation.\n";

/** Add many listings from a CSV file: check first, then import. */
export function ImportDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const id = useId();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const run = useMutation({
    mutationFn: (dryRun: boolean) => {
      if (!file) throw new Error("Choose a file first.");
      return adminApi.importInstallers(file, dryRun);
    },
    onSuccess: (result) => {
      setReport(result);
      setError(null);
      if (!result.dry_run) {
        toast.success(`${result.created} listings imported.`);
        void queryClient.invalidateQueries({ queryKey: ["admin"] });
      }
    },
    onError: (caught) =>
      setError(
        caught instanceof ApiError
          ? (Object.values(caught.fields ?? {})[0] ?? caught.message)
          : caught instanceof Error
            ? caught.message
            : "Couldn't read the file.",
      ),
  });

  function close() {
    setFile(null);
    setReport(null);
    setError(null);
    onClose();
  }

  const templateUrl = `data:text/csv;charset=utf-8,${encodeURIComponent(TEMPLATE)}`;

  return (
    <Drawer
      open={open}
      onClose={close}
      wide
      title="Import installers from CSV"
      description="Up to 500 rows. Rows that are already listed (same business name or email) are skipped."
      footer={
        <>
          <Button variant="outline" onClick={close}>
            {report && !report.dry_run ? "Done" : "Cancel"}
          </Button>
          {report?.dry_run && report.created > 0 ? (
            <Button loading={run.isPending} onClick={() => run.mutate(false)}>
              Import {report.created} listing{report.created === 1 ? "" : "s"}
            </Button>
          ) : (
            <Button
              disabled={!file}
              loading={run.isPending}
              onClick={() => run.mutate(true)}
            >
              Check file
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-5">
        <Notice tone="info">
          Required columns: <strong>business_name</strong>,{" "}
          <strong>contact_email</strong>, <strong>phone</strong>,{" "}
          <strong>postcode</strong>. Optional: contact_name, accreditations
          (e.g. “NICEIC; OZEV”), services, coverage_radius_miles, description.{" "}
          <a
            href={templateUrl}
            download="installers-template.csv"
            className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
          >
            <Download aria-hidden className="size-3.5" /> Download a template
          </a>
        </Notice>
        <Field
          label="CSV file"
          htmlFor={`${id}-file`}
          error={error ?? undefined}
        >
          <label
            htmlFor={`${id}-file`}
            className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-line bg-surface px-6 py-8 text-center hover:border-primary/50"
          >
            <FileUp aria-hidden className="size-7 text-primary" />
            <span className="text-sm font-medium text-ink">
              {file ? file.name : "Choose a .csv file"}
            </span>
            <span className="text-xs text-subtle">At most 1 MB</span>
          </label>
          <input
            id={`${id}-file`}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              setReport(null);
              setError(null);
            }}
          />
        </Field>
        {report ? <ImportSummary report={report} /> : null}
      </div>
    </Drawer>
  );
}

function ImportSummary({ report }: { report: ImportReport }) {
  return (
    <section className="space-y-3">
      <div className="grid grid-cols-3 gap-3 text-center">
        <Stat
          label={report.dry_run ? "Ready to import" : "Imported"}
          value={report.created}
          tone="text-primary"
        />
        <Stat label="Skipped" value={report.skipped.length} tone="text-ink" />
        <Stat
          label="Problems"
          value={report.errors.length}
          tone="text-red-600"
        />
      </div>
      {report.errors.length || report.skipped.length ? (
        <ul className="max-h-72 divide-y divide-line overflow-y-auto rounded-xl border border-line text-[13px]">
          {[
            ...report.errors.map((row) => ({ ...row, kind: "error" as const })),
            ...report.skipped.map((row) => ({ ...row, kind: "skip" as const })),
          ]
            .sort((a, b) => a.row - b.row)
            .map((row) => (
              <li
                key={`${row.kind}-${row.row}`}
                className="flex gap-3 px-3 py-2"
              >
                <Badge tone={row.kind === "error" ? "red" : "neutral"}>
                  Row {row.row}
                </Badge>
                <span className="min-w-0">
                  <span className="font-medium text-ink">
                    {row.business_name ?? "—"}
                  </span>
                  : {row.message}
                </span>
              </li>
            ))}
        </ul>
      ) : null}
    </section>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="rounded-xl border border-line p-3">
      <p className={`text-2xl font-bold ${tone}`}>{value}</p>
      <p className="text-xs text-subtle">{label}</p>
    </div>
  );
}

/** Edit a listing's business details (the website updates straight away). */
export function DetailsForm({
  installer,
  saving,
  errors,
  onSave,
}: {
  installer: AdminInstaller;
  saving: boolean;
  errors: Record<string, string>;
  onSave: (body: AdminInstallerUpdate) => void;
}) {
  const id = useId();
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body: AdminInstallerUpdate = {
      business_name: text(form, "business_name"),
      contact_name: text(form, "contact_name") || null,
      phone: text(form, "phone"),
      description: text(form, "description") || null,
      coverage_radius_miles: Number(form.get("coverage_radius_miles")),
      tagline: text(form, "tagline") || null,
      website_url: text(form, "website_url") || null,
      company_number: text(form, "company_number") || null,
      years_experience: text(form, "years_experience")
        ? Number(form.get("years_experience"))
        : null,
      areas_covered: text(form, "areas_covered")
        .split(/[\n,]/)
        .map((area) => area.trim())
        .filter(Boolean),
      services: SERVICES.filter((service) => form.get(`service_${service}`)),
      accreditations: SCHEMES.filter((scheme) =>
        form.get(`scheme_${scheme}`),
      ).map((scheme) => ({
        scheme,
        registration_number: text(form, `reg_${scheme}`) || null,
      })),
    };
    const postcode = text(form, "base_postcode");
    if (postcode && postcode !== installer.base_postcode)
      body.base_postcode = postcode;
    onSave(body);
  }
  return (
    <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2" noValidate>
      <Field
        label="Business name"
        htmlFor={`${id}-name`}
        error={errors.business_name}
        className="sm:col-span-2"
      >
        <Input
          id={`${id}-name`}
          name="business_name"
          defaultValue={installer.business_name}
        />
      </Field>
      <Field
        label="Contact name"
        htmlFor={`${id}-contact`}
        error={errors.contact_name}
      >
        <Input
          id={`${id}-contact`}
          name="contact_name"
          defaultValue={installer.contact_name}
        />
      </Field>
      <Field label="Phone" htmlFor={`${id}-phone`} error={errors.phone}>
        <Input id={`${id}-phone`} name="phone" defaultValue={installer.phone} />
      </Field>
      <Field
        label="Base postcode"
        htmlFor={`${id}-postcode`}
        error={errors.base_postcode}
      >
        <Input
          id={`${id}-postcode`}
          name="base_postcode"
          defaultValue={installer.base_postcode}
        />
      </Field>
      <Field
        label="Coverage (miles)"
        htmlFor={`${id}-radius`}
        error={errors.coverage_radius_miles}
      >
        <Input
          id={`${id}-radius`}
          name="coverage_radius_miles"
          type="number"
          min={1}
          max={100}
          defaultValue={installer.coverage_radius_miles}
        />
      </Field>
      <Field
        label="Description"
        htmlFor={`${id}-description`}
        error={errors.description}
        className="sm:col-span-2"
      >
        <Textarea
          id={`${id}-description`}
          name="description"
          rows={4}
          defaultValue={installer.description ?? ""}
        />
      </Field>
      <Field
        label="Tagline"
        htmlFor={`${id}-tagline`}
        error={errors.tagline}
        className="sm:col-span-2"
        hint="One line under the name on cards and the profile (120 characters)."
      >
        <Input
          id={`${id}-tagline`}
          name="tagline"
          maxLength={120}
          defaultValue={installer.tagline ?? ""}
        />
      </Field>
      <Field
        label="Website"
        htmlFor={`${id}-website`}
        error={errors.website_url}
      >
        <Input
          id={`${id}-website`}
          name="website_url"
          placeholder="https://"
          defaultValue={installer.website_url ?? ""}
        />
      </Field>
      <Field
        label="Company number"
        htmlFor={`${id}-company`}
        error={errors.company_number}
      >
        <Input
          id={`${id}-company`}
          name="company_number"
          defaultValue={installer.company_number ?? ""}
        />
      </Field>
      <Field
        label="Years of experience"
        htmlFor={`${id}-years`}
        error={errors.years_experience}
        hint="Only fill in if you know it. Leave empty to show nothing."
      >
        <Input
          id={`${id}-years`}
          name="years_experience"
          type="number"
          min={0}
          max={80}
          defaultValue={installer.years_experience ?? ""}
        />
      </Field>
      <Field
        label="Areas covered"
        htmlFor={`${id}-areas`}
        error={errors.areas_covered}
        hint="Towns, separated by commas or new lines (up to 20)."
        className="sm:col-span-2"
      >
        <Textarea
          id={`${id}-areas`}
          name="areas_covered"
          rows={2}
          defaultValue={installer.areas_covered.join(", ")}
        />
      </Field>
      <fieldset className="sm:col-span-2">
        <legend className="mb-1.5 text-[13px] font-semibold text-ink">
          Services
        </legend>
        {errors.services ? (
          <p role="alert" className="mb-1.5 text-xs text-red-600">
            {errors.services}
          </p>
        ) : null}
        <div className="grid gap-2 sm:grid-cols-2">
          {SERVICES.map((service) => (
            <Checkbox
              key={service}
              name={`service_${service}`}
              defaultChecked={installer.services.includes(service)}
              label={serviceLabels[service]}
            />
          ))}
        </div>
      </fieldset>
      <fieldset className="sm:col-span-2">
        <legend className="mb-1.5 text-[13px] font-semibold text-ink">
          Accreditations
        </legend>
        {errors.accreditations ? (
          <p role="alert" className="mb-1.5 text-xs text-red-600">
            {errors.accreditations}
          </p>
        ) : null}
        <p className="mb-2 text-xs text-subtle">
          Changing a registration number clears its “Verified” tick below.
        </p>
        <div className="grid gap-2">
          {SCHEMES.map((scheme) => {
            const current = installer.accreditations.find(
              (item) => item.scheme === scheme,
            );
            return (
              <div
                key={scheme}
                className="flex flex-wrap items-center justify-between gap-2"
              >
                <Checkbox
                  name={`scheme_${scheme}`}
                  defaultChecked={!!current}
                  label={accreditationLabels[scheme]}
                />
                <Input
                  name={`reg_${scheme}`}
                  aria-label={`${accreditationLabels[scheme]} registration number`}
                  placeholder="Registration number"
                  maxLength={60}
                  className="h-8 max-w-48"
                  defaultValue={current?.registration_number ?? ""}
                />
              </div>
            );
          })}
        </div>
      </fieldset>
      <div className="sm:col-span-2">
        <Button type="submit" variant="outline" loading={saving}>
          Save details
        </Button>
      </div>
    </form>
  );
}

/** Logo and gallery photos of a listing, managed by the team. */
export function MediaSection({
  installer,
  onChange,
}: {
  installer: AdminInstaller;
  onChange: (installer: AdminInstaller) => void;
}) {
  const toast = useToast();
  const logoInput = useRef<HTMLInputElement>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const onError = (error: unknown) =>
    toast.error(
      error instanceof ApiError ? error.message : "Couldn't update the images.",
    );

  const uploadLogo = useMutation({
    mutationFn: (file: File) =>
      adminApi.uploadInstallerLogo(installer.id, file),
    onSuccess: onChange,
    onError,
  });
  const removeLogo = useMutation({
    mutationFn: () => adminApi.removeInstallerLogo(installer.id),
    onSuccess: onChange,
    onError,
  });
  const addPhoto = useMutation({
    mutationFn: (file: File) =>
      adminApi.uploadInstallerPhoto(installer.id, file, ""),
    onSuccess: onChange,
    onError,
  });
  const removePhoto = useMutation({
    mutationFn: (photoId: string) =>
      adminApi.deleteInstallerPhoto(installer.id, photoId),
    onSuccess: onChange,
    onError,
  });

  return (
    <section className="space-y-4">
      <h3 className="text-[13px] font-semibold">Logo and photos</h3>
      <div className="flex flex-wrap items-center gap-3">
        {installer.logo_url ? (
          <img
            src={installer.logo_url}
            alt=""
            className="size-14 rounded-xl border border-line object-cover"
          />
        ) : (
          <span className="grid size-14 place-items-center rounded-xl border border-dashed border-line text-xs text-subtle">
            None
          </span>
        )}
        <input
          ref={logoInput}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) uploadLogo.mutate(file);
            event.target.value = "";
          }}
        />
        <Button
          size="sm"
          variant="outline"
          loading={uploadLogo.isPending}
          onClick={() => logoInput.current?.click()}
        >
          {installer.logo_url ? "Replace logo" : "Upload logo"}
        </Button>
        {installer.logo_url ? (
          <Button
            size="sm"
            variant="ghost"
            loading={removeLogo.isPending}
            onClick={() => removeLogo.mutate()}
          >
            Remove
          </Button>
        ) : null}
      </div>
      <div>
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {installer.photos.map((photo) => (
            <li key={photo.id} className="group relative">
              <img
                src={photo.url}
                alt={photo.alt ?? ""}
                className="aspect-[4/3] w-full rounded-lg border border-line object-cover"
              />
              <button
                type="button"
                aria-label="Delete photo"
                disabled={removePhoto.isPending}
                onClick={() => {
                  if (window.confirm("Delete this photo?"))
                    removePhoto.mutate(photo.id);
                }}
                className="absolute top-1 right-1 cursor-pointer rounded-md bg-ink/80 px-2 py-0.5 text-xs font-semibold text-white opacity-100 sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
        <input
          ref={photoInput}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) addPhoto.mutate(file);
            event.target.value = "";
          }}
        />
        <Button
          size="sm"
          variant="outline"
          className="mt-3"
          loading={addPhoto.isPending}
          onClick={() => photoInput.current?.click()}
        >
          Add photo
        </Button>
      </div>
    </section>
  );
}
