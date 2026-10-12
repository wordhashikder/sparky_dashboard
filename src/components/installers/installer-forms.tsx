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
      <div className="sm:col-span-2">
        <Button type="submit" variant="outline" loading={saving}>
          Save details
        </Button>
      </div>
    </form>
  );
}
