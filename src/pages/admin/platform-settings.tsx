import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Bell,
  Building2,
  CheckCircle2,
  CircleSlash,
  Save,
  Zap,
} from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Notice } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorState, PageLoader } from "@/components/ui/states";
import { Toggle } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api";
import { adminApi } from "@/lib/endpoints";
import type { PlatformSettings, PlatformStatus } from "@/lib/types";

/** Lead matching, team notifications and the organisation's details. */
export default function PlatformSettingsPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["admin", "settings"],
    queryFn: adminApi.settings,
  });
  const [form, setForm] = useState<PlatformSettings | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  useEffect(() => {
    if (query.data) setForm(structuredClone(query.data.settings));
  }, [query.data]);

  const save = useMutation({
    mutationFn: (body: PlatformSettings) => adminApi.saveSettings(body),
    onSuccess: (result) => {
      queryClient.setQueryData(["admin", "settings"], result);
      void queryClient.invalidateQueries({ queryKey: ["platform"] });
      setErrors({});
      toast.success("Settings saved.");
    },
    onError: (error) => {
      if (error instanceof ApiError && error.fields) setErrors(error.fields);
      toast.error(error instanceof ApiError ? error.message : "Couldn't save.");
    },
  });

  if (query.isPending || !form) return <PageLoader />;
  if (query.isError)
    return (
      <ErrorState error={query.error} onRetry={() => void query.refetch()} />
    );
  const dirty = JSON.stringify(form) !== JSON.stringify(query.data.settings);
  const set = <S extends keyof PlatformSettings>(
    section: S,
    value: Partial<PlatformSettings[S]>,
  ) =>
    setForm((current) =>
      current
        ? { ...current, [section]: { ...current[section], ...value } }
        : current,
    );

  return (
    <>
      <Link
        to="/settings"
        className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-primary hover:underline"
      >
        <ArrowLeft aria-hidden className="size-4" /> Settings
      </Link>
      <PageHeader
        title="Platform settings"
        description="How quote requests are matched, how the team is alerted, and the details shown to homeowners and installers."
        actions={
          <Button
            disabled={!dirty}
            loading={save.isPending}
            onClick={() => save.mutate(form)}
            icon={<Save aria-hidden className="size-4" />}
          >
            Save changes
          </Button>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader
              title={
                <span className="flex items-center gap-2">
                  <Zap aria-hidden className="size-4 text-primary" /> Lead
                  matching
                </span>
              }
              description="What happens when a homeowner asks for quotes."
            />
            <CardBody className="space-y-5">
              <SettingRow
                title="Automatic matching"
                text={
                  form.lead_matching.automatic
                    ? "On: each request goes straight to the best-placed installers who cover the address."
                    : "Off: requests wait in Leads & Quotes for you to choose the installers. The homeowner is told you're on it."
                }
              >
                <Toggle
                  on={form.lead_matching.automatic}
                  disabled={false}
                  label="Automatic matching"
                  onChange={() =>
                    set("lead_matching", {
                      automatic: !form.lead_matching.automatic,
                    })
                  }
                />
              </SettingRow>
              <Field
                label="Installers per request"
                htmlFor="max-installers"
                error={errors["lead_matching.max_installers"]}
                hint="The most installers a request is sent to (1 to 20). The website promises “up to 5 quotes”, so change its wording too if you change this."
              >
                <Input
                  id="max-installers"
                  type="number"
                  min={1}
                  max={20}
                  className="max-w-32"
                  value={form.lead_matching.max_installers}
                  onChange={(event) =>
                    set("lead_matching", {
                      max_installers: Number(event.target.value),
                    })
                  }
                />
              </Field>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title={
                <span className="flex items-center gap-2">
                  <Bell aria-hidden className="size-4 text-primary" /> Team
                  notifications
                </span>
              }
              description="Alerts for things that need a person: unmatched or held requests, enquiries for unclaimed listings, contact messages and listing claims."
            />
            <CardBody className="space-y-5">
              <SettingRow
                title="Email alerts"
                text={`Sent to ${form.organisation.support_email}.`}
              >
                <Toggle
                  on={form.notifications.email_alerts}
                  disabled={false}
                  label="Email alerts"
                  onChange={() =>
                    set("notifications", {
                      email_alerts: !form.notifications.email_alerts,
                    })
                  }
                />
              </SettingRow>
              <SettingRow
                title="SMS alerts"
                text="Needs an SMS provider, which isn't set up yet. Ask your developer to connect one (e.g. Twilio)."
              >
                <Toggle
                  on={false}
                  disabled
                  label="SMS alerts (not available)"
                  onChange={() => undefined}
                />
              </SettingRow>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title={
                <span className="flex items-center gap-2">
                  <Building2 aria-hidden className="size-4 text-primary" />{" "}
                  Organisation
                </span>
              }
              description="Used as the sender name of every email and wherever the website shows {brand} or {email}."
            />
            <CardBody className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Platform name"
                htmlFor="platform-name"
                error={errors["organisation.platform_name"]}
              >
                <Input
                  id="platform-name"
                  value={form.organisation.platform_name}
                  maxLength={60}
                  onChange={(event) =>
                    set("organisation", { platform_name: event.target.value })
                  }
                />
              </Field>
              <Field
                label="Support email"
                htmlFor="support-email"
                error={errors["organisation.support_email"]}
                hint="Shown on the website and used for team alerts."
              >
                <Input
                  id="support-email"
                  type="email"
                  value={form.organisation.support_email}
                  onChange={(event) =>
                    set("organisation", { support_email: event.target.value })
                  }
                />
              </Field>
            </CardBody>
          </Card>
        </div>
        <SystemStatus status={query.data.status} />
      </div>
      {dirty ? (
        <Notice tone="warning" className="mt-6">
          You have unsaved changes.
        </Notice>
      ) : null}
    </>
  );
}

function SettingRow({
  title,
  text,
  children,
}: {
  title: string;
  text: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-semibold text-ink">{title}</p>
        <p className="mt-0.5 text-[13px]">{text}</p>
      </div>
      {children}
    </div>
  );
}

function SystemStatus({ status }: { status: PlatformStatus }) {
  const rows: [string, boolean, string][] = [
    ["Email sending", status.email_configured, "SMTP"],
    ["Image uploads", status.image_uploads_configured, "Cloudinary"],
    ["Payments", status.payments_configured, "Stripe"],
    ["SMS", status.sms_configured, "Not connected"],
  ];
  return (
    <Card className="self-start">
      <CardHeader
        title="System status"
        description="Set on the server by your developer. Secrets are never shown here."
      />
      <ul className="divide-y divide-line">
        {rows.map(([label, ok, detail]) => (
          <li
            key={label}
            className="flex items-center justify-between gap-3 px-5 py-3 text-sm"
          >
            <span className="text-ink">{label}</span>
            <span
              className={
                ok
                  ? "flex items-center gap-1.5 text-forest"
                  : "flex items-center gap-1.5 text-subtle"
              }
            >
              {ok ? (
                <CheckCircle2 aria-hidden className="size-4 text-primary" />
              ) : (
                <CircleSlash aria-hidden className="size-4" />
              )}
              {ok
                ? "Connected"
                : detail === "Not connected"
                  ? detail
                  : "Not set up"}
            </span>
          </li>
        ))}
      </ul>
      <dl className="space-y-1 border-t border-line px-5 py-4 text-xs">
        <div className="flex justify-between gap-2">
          <dt className="text-subtle">Environment</dt>
          <dd className="text-ink">{status.environment}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-subtle">Website</dt>
          <dd className="truncate text-ink">{status.frontend_url}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-subtle">Dashboard</dt>
          <dd className="truncate text-ink">{status.dashboard_url}</dd>
        </div>
      </dl>
    </Card>
  );
}
