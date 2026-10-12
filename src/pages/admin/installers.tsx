import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { ExternalLink, FileUp, Mail, Plus, Search, Send } from "lucide-react";
import { type FormEvent, type ReactNode, useState } from "react";
import { useSearchParams } from "react-router";
import {
  AddInstallerDrawer,
  DetailsForm,
  ImportDrawer,
} from "@/components/installers/installer-forms";
import { Badge, statusTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Drawer } from "@/components/ui/drawer";
import { Checkbox, Field, Input, Notice, Select } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState, ErrorState, PageLoader } from "@/components/ui/states";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { Tabs } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api";
import { siteLinks } from "@/lib/config";
import { adminApi, type InstallerFilters } from "@/lib/endpoints";
import { formatDate } from "@/lib/format";
import {
  accreditationLabels,
  installerStatusLabels,
  planLabels,
  sourceLabels,
  subscriptionLabels,
} from "@/lib/labels";
import type {
  AdminInstaller,
  AdminInstallerUpdate,
  InstallerSource,
  InstallerStatus,
  Plan,
} from "@/lib/types";
import { useDebounced } from "@/lib/use-debounced";

const STATUSES = Object.keys(installerStatusLabels) as InstallerStatus[];
const PLANS = Object.keys(planLabels) as Plan[];

export default function InstallersPage() {
  const [params, setParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Omit<InstallerFilters, "q">>({
    status: (params.get("status") as InstallerStatus | null) ?? "",
    source: "",
    plan: "",
    claimed: "",
  });
  const openId = params.get("open");
  const setOpenId = (id: string | null) => {
    const copy = new URLSearchParams(params);
    if (id) copy.set("open", id);
    else copy.delete("open");
    setParams(copy, { replace: true });
  };
  const q = useDebounced(search);
  const query = useQuery({
    queryKey: ["admin", "installers", { page, q, ...filters }],
    queryFn: () => adminApi.installers(page, { q, ...filters }),
    placeholderData: keepPreviousData,
  });

  function setFilter<K extends keyof typeof filters>(
    key: K,
    value: (typeof filters)[K],
  ) {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  }

  return (
    <>
      <PageHeader
        title="Installers"
        description="Every business on PickASparky: approve new sign-ups, manage plans, add or import listings, and invite free listings to claim their profile."
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => setImporting(true)}
              icon={<FileUp aria-hidden className="size-4" />}
            >
              Import CSV
            </Button>
            <Button
              onClick={() => setAdding(true)}
              icon={<Plus aria-hidden className="size-4" />}
            >
              Add installer
            </Button>
          </>
        }
      />
      <Tabs
        label="Status"
        value={filters.status || "all"}
        onChange={(value) =>
          setFilter("status", value === "all" ? "" : (value as InstallerStatus))
        }
        tabs={[
          { value: "all", label: "All installers" },
          ...STATUSES.map((key) => ({
            value: key,
            label: installerStatusLabels[key],
          })),
        ]}
      />
      <Card>
        <div className="grid gap-3 border-b border-line p-4 md:grid-cols-[1fr_auto_auto_auto]">
          <div className="relative">
            <Search
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle"
            />
            <label htmlFor="installer-search" className="sr-only">
              Search installers
            </label>
            <Input
              id="installer-search"
              type="search"
              placeholder="Business, town, postcode or email"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>
          <FilterSelect
            label="Plan"
            value={filters.plan ?? ""}
            onChange={(value) => setFilter("plan", value as Plan)}
            options={PLANS.map((key) => [key, planLabels[key]])}
          />
          <FilterSelect
            label="Source"
            value={filters.source ?? ""}
            onChange={(value) => setFilter("source", value as InstallerSource)}
            options={[
              ["registered", sourceLabels.registered],
              ["imported", sourceLabels.imported],
            ]}
          />
          <FilterSelect
            label="Account"
            value={filters.claimed ?? ""}
            onChange={(value) =>
              setFilter("claimed", value as "true" | "false" | "")
            }
            options={[
              ["true", "Has an account"],
              ["false", "Unclaimed"],
            ]}
          />
        </div>
        {query.isPending ? (
          <PageLoader />
        ) : query.isError ? (
          <ErrorState
            error={query.error}
            onRetry={() => void query.refetch()}
          />
        ) : query.data.items.length === 0 ? (
          <EmptyState title="No installers match these filters" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Business</Th>
                <Th>Town</Th>
                <Th>Plan</Th>
                <Th>Status</Th>
                <Th>Account</Th>
                <Th>Rating</Th>
              </tr>
            </thead>
            <tbody>
              {query.data.items.map((installer) => (
                <Tr key={installer.id}>
                  <Td>
                    <button
                      type="button"
                      onClick={() => setOpenId(installer.id)}
                      className="cursor-pointer text-left font-medium text-primary hover:underline"
                    >
                      {installer.business_name}
                    </button>
                    <p className="text-xs">{installer.email ?? "No email"}</p>
                  </Td>
                  <Td>
                    {installer.town}
                    <p className="text-xs">{installer.base_postcode}</p>
                  </Td>
                  <Td>
                    <Badge tone={statusTone[installer.plan]}>
                      {planLabels[installer.plan]}
                    </Badge>
                    {installer.is_featured ? (
                      <Badge tone="amber" className="ml-1">
                        Featured
                      </Badge>
                    ) : null}
                  </Td>
                  <Td>
                    <Badge tone={statusTone[installer.status]}>
                      {installerStatusLabels[installer.status]}
                    </Badge>
                  </Td>
                  <Td>
                    {installer.is_claimed ? (
                      <Badge tone="green">Claimed</Badge>
                    ) : (
                      <Badge tone="neutral">Unclaimed</Badge>
                    )}
                  </Td>
                  <Td>
                    {installer.rating_avg
                      ? `${installer.rating_avg.toFixed(1)} (${installer.review_count})`
                      : "—"}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
        {query.data ? (
          <Pagination
            page={page}
            pages={query.data.pages}
            total={query.data.total}
            onChange={setPage}
            noun="installers"
          />
        ) : null}
      </Card>
      <InstallerDrawer id={openId} onClose={() => setOpenId(null)} />
      <AddInstallerDrawer
        open={adding}
        onClose={() => setAdding(false)}
        onCreated={(installer) => {
          setAdding(false);
          setOpenId(installer.id);
        }}
      />
      <ImportDrawer open={importing} onClose={() => setImporting(false)} />
    </>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: [string, string][];
}) {
  const id = `filter-${label.toLowerCase()}`;
  return (
    <div>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">{`Any ${label.toLowerCase()}`}</option>
        {options.map(([key, text]) => (
          <option key={key} value={key}>
            {text}
          </option>
        ))}
      </Select>
    </div>
  );
}

function InstallerDrawer({
  id,
  onClose,
}: {
  id: string | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const query = useQuery({
    queryKey: ["admin", "installer", id],
    queryFn: () => adminApi.installer(id ?? ""),
    enabled: !!id,
  });

  const onError = (error: unknown) => {
    if (error instanceof ApiError && error.fields) setErrors(error.fields);
    toast.error(error instanceof ApiError ? error.message : "Couldn't save.");
  };
  const onSaved = (installer: AdminInstaller) => {
    queryClient.setQueryData(["admin", "installer", installer.id], installer);
    void queryClient.invalidateQueries({ queryKey: ["admin", "installers"] });
    void queryClient.invalidateQueries({ queryKey: ["admin", "overview"] });
  };
  const update = useMutation({
    mutationFn: (body: AdminInstallerUpdate) =>
      adminApi.updateInstaller(id ?? "", body),
    onSuccess: (installer) => {
      onSaved(installer);
      setErrors({});
      toast.success("Installer updated. The website shows the change now.");
    },
    onError,
  });
  const verify = useMutation({
    mutationFn: ({ scheme, verified }: { scheme: string; verified: boolean }) =>
      adminApi.verifyAccreditation(id ?? "", scheme, verified),
    onSuccess: onSaved,
    onError,
  });
  const invite = useMutation({
    mutationFn: () => adminApi.claimInvite(id ?? ""),
    onSuccess: (result) => toast.success(result.message),
    onError,
  });

  const installer = query.data;
  return (
    <Drawer
      open={!!id}
      onClose={onClose}
      wide
      title={installer?.business_name ?? "Installer"}
      description={
        installer
          ? `${installer.town} · joined ${formatDate(installer.created_at)}`
          : undefined
      }
    >
      {query.isPending ? (
        <PageLoader />
      ) : query.isError ? (
        <ErrorState error={query.error} />
      ) : installer ? (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            <a
              href={siteLinks.installer(installer.slug)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-line px-3 text-[13px] font-semibold text-ink hover:border-ink/30"
            >
              Public profile
              <ExternalLink aria-hidden className="size-3.5" />
            </a>
            <Badge tone={statusTone[installer.status]}>
              {installerStatusLabels[installer.status]}
            </Badge>
            <Badge tone={installer.is_claimed ? "green" : "neutral"}>
              {installer.is_claimed ? "Claimed" : "Unclaimed"}
            </Badge>
            <Badge tone="mint">{sourceLabels[installer.source]}</Badge>
          </div>

          <dl className="grid grid-cols-[130px_1fr] gap-x-4 gap-y-2 text-sm">
            <Item label="Contact">{installer.contact_name || "—"}</Item>
            <Item label="Email">{installer.email ?? "—"}</Item>
            <Item label="Phone">{installer.phone || "—"}</Item>
            <Item label="Address">
              {installer.address ?? installer.base_postcode}
            </Item>
            <Item label="Subscription">
              {subscriptionLabels[installer.subscription_status]}
            </Item>
            {installer.requested_plan ? (
              <Item label="Asked for">
                {planLabels[installer.requested_plan]}
              </Item>
            ) : null}
            <Item label="Claimed">{formatDate(installer.claimed_at)}</Item>
            <Item label="Approved">{formatDate(installer.approved_at)}</Item>
          </dl>

          <section className="space-y-3">
            <h3 className="text-[13px] font-semibold">Business details</h3>
            <DetailsForm
              key={installer.id}
              installer={installer}
              saving={update.isPending}
              errors={errors}
              onSave={(body) => update.mutate(body)}
            />
          </section>

          <section className="space-y-3">
            <h3 className="text-[13px] font-semibold">Listing</h3>
            {installer.status === "pending" ? (
              <div className="flex gap-2">
                <Button
                  loading={update.isPending}
                  onClick={() => update.mutate({ status: "approved" })}
                >
                  Approve
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (window.confirm("Reject this application?"))
                      update.mutate({ status: "rejected" });
                  }}
                >
                  Reject
                </Button>
              </div>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Status" htmlFor="admin-status">
                <Select
                  id="admin-status"
                  value={installer.status}
                  disabled={update.isPending}
                  onChange={(event) =>
                    update.mutate({
                      status: event.target.value as InstallerStatus,
                    })
                  }
                >
                  {STATUSES.map((key) => (
                    <option key={key} value={key}>
                      {installerStatusLabels[key]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field
                label="Plan"
                htmlFor="admin-plan"
                hint="Normally set by Stripe billing."
              >
                <Select
                  id="admin-plan"
                  value={installer.plan}
                  disabled={update.isPending}
                  onChange={(event) =>
                    update.mutate({ plan: event.target.value as Plan })
                  }
                >
                  {PLANS.map((key) => (
                    <option key={key} value={key}>
                      {planLabels[key]}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Checkbox
              checked={installer.is_featured}
              disabled={update.isPending}
              onChange={(event) =>
                update.mutate({ is_featured: event.target.checked })
              }
              label="Featured (shown first in its plan)"
            />
          </section>

          {!installer.is_claimed ? (
            <ClaimSection
              installer={installer}
              saving={update.isPending}
              onSaveEmail={(email) => update.mutate({ contact_email: email })}
              onInvite={() => invite.mutate()}
              inviting={invite.isPending}
            />
          ) : null}

          <section>
            <h3 className="mb-2 text-[13px] font-semibold">Accreditations</h3>
            {installer.accreditations.length === 0 ? (
              <p className="text-sm">None listed.</p>
            ) : (
              <ul className="divide-y divide-line rounded-xl border border-line">
                {installer.accreditations.map((item) => (
                  <li
                    key={item.scheme}
                    className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
                  >
                    <span className="text-ink">
                      {accreditationLabels[item.scheme]}
                      {item.registration_number ? (
                        <span className="ml-2 text-xs text-subtle">
                          {item.registration_number}
                        </span>
                      ) : null}
                    </span>
                    <Checkbox
                      checked={item.verified}
                      disabled={verify.isPending}
                      onChange={(event) =>
                        verify.mutate({
                          scheme: item.scheme,
                          verified: event.target.checked,
                        })
                      }
                      label="Verified"
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}
    </Drawer>
  );
}

function ClaimSection({
  installer,
  saving,
  onSaveEmail,
  onInvite,
  inviting,
}: {
  installer: AdminInstaller;
  saving: boolean;
  onSaveEmail: (email: string | null) => void;
  onInvite: () => void;
  inviting: boolean;
}) {
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = String(
      new FormData(event.currentTarget).get("contact_email") ?? "",
    ).trim();
    onSaveEmail(value || null);
  }
  return (
    <section className="space-y-3 rounded-xl border border-[#e3efec] bg-mint-soft p-4">
      <h3 className="flex items-center gap-2 text-[13px] font-semibold">
        <Mail aria-hidden className="size-4 text-primary" />
        Claiming
      </h3>
      <p className="text-[13px]">
        This free listing has no account. The business can claim it with the
        email below; it receives no leads until it claims and upgrades.
      </p>
      <form onSubmit={onSubmit} className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="contact_email" className="sr-only">
          Claim email
        </label>
        <Input
          id="contact_email"
          name="contact_email"
          type="email"
          defaultValue={installer.email ?? ""}
          placeholder="office@business.co.uk"
        />
        <Button type="submit" variant="outline" loading={saving}>
          Save email
        </Button>
      </form>
      {installer.email ? (
        <Button
          onClick={onInvite}
          loading={inviting}
          icon={<Send aria-hidden className="size-4" />}
        >
          Send claim invitation
        </Button>
      ) : (
        <Notice tone="warning">
          Add an email address to send a claim invitation.
        </Notice>
      )}
    </section>
  );
}

function Item({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="contents">
      <dt className="text-subtle">{label}</dt>
      <dd className="break-words text-ink">{children}</dd>
    </div>
  );
}
