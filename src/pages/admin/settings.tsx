import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, XCircle } from "lucide-react";
import type { ReactNode } from "react";
import { ChangePasswordCard } from "@/components/account/change-password";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorState, PageLoader } from "@/components/ui/states";
import { useUser } from "@/lib/auth";
import { adminApi } from "@/lib/endpoints";

export default function SettingsPage() {
  const user = useUser();
  const query = useQuery({
    queryKey: ["admin", "platform"],
    queryFn: adminApi.platform,
  });

  return (
    <>
      <PageHeader
        title="Settings"
        description="Your account and the platform's configuration. Platform settings are environment variables on the server (see backend/.env.example)."
      />
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Your account" />
            <CardBody className="space-y-3 text-sm">
              <Row label="Email">{user.email}</Row>
              <Row label="Role">Admin</Row>
            </CardBody>
          </Card>
          <ChangePasswordCard />
        </div>
        <Card>
          <CardHeader
            title="Platform"
            description="Read-only. Never shows secrets."
          />
          <CardBody>
            {query.isPending ? (
              <PageLoader />
            ) : query.isError ? (
              <ErrorState
                error={query.error}
                onRetry={() => void query.refetch()}
              />
            ) : (
              <div className="space-y-3 text-sm">
                <Row label="Environment">{query.data.environment}</Row>
                <Row label="Website">{query.data.frontend_url}</Row>
                <Row label="Dashboard">{query.data.dashboard_url}</Row>
                <Row label="Support email">{query.data.support_email}</Row>
                <Row label="Installers per quote request">
                  {query.data.max_quote_matches}
                </Row>
                <Row label="Email (SMTP)">
                  <Status on={query.data.email_configured} />
                </Row>
                <Row label="Image uploads (Cloudinary)">
                  <Status on={query.data.image_uploads_configured} />
                </Row>
                <Row label="Payments (Stripe)">
                  <Status on={query.data.payments_configured} />
                </Row>
                <Row label="Showcase installers">
                  <Status
                    on={query.data.showcase_enabled}
                    labels={["Loaded", "Off"]}
                  />
                </Row>
                <div className="border-t border-line pt-3">
                  <p className="mb-2 text-[13px] font-semibold text-ink">
                    Admin accounts
                  </p>
                  <ul className="space-y-1">
                    {query.data.admins.map((email) => (
                      <li key={email} className="text-ink">
                        {email}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs text-subtle">
                    Add an admin on the server with{" "}
                    <code className="rounded bg-surface px-1">
                      python -m app.cli create-admin
                    </code>
                    .
                  </p>
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <span>{label}</span>
      <span className="break-all text-right text-ink">{children}</span>
    </div>
  );
}

function Status({
  on,
  labels = ["Configured", "Not configured"],
}: {
  on: boolean;
  labels?: [string, string];
}) {
  return on ? (
    <span className="inline-flex items-center gap-1.5 text-forest">
      <CheckCircle2 aria-hidden className="size-4 text-primary" />
      {labels[0]}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-amber-800">
      <XCircle aria-hidden className="size-4 text-amber-600" />
      {labels[1]}
    </span>
  );
}
