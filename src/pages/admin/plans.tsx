import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CloudUpload, Pencil, Plus, Trash2 } from "lucide-react";
import { type FormEvent, useId, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Drawer } from "@/components/ui/drawer";
import { Checkbox, Field, Input, Notice, Textarea } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, ErrorState, PageLoader } from "@/components/ui/states";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api";
import { adminApi } from "@/lib/endpoints";
import { formatNumber, formatPence } from "@/lib/format";
import type { AdminPlan, AdminPlanInput } from "@/lib/types";

const PLANS_KEY = ["admin", "plans"];
const text = (form: FormData, name: string) =>
  String(form.get(name) ?? "").trim();

/** £ typed by a person ("29", "29.50") to pence; null when blank, NaN when invalid. */
function toPence(value: string) {
  if (!value) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(value)) return Number.NaN;
  return Math.round(Number(value) * 100);
}

/**
 * Plans & pricing: every membership plan the website, sign-up and installers see.
 * Prices and perks are saved here (never in settings files) and created in Stripe
 * automatically. A price change applies to new subscribers; current ones keep theirs.
 */
export default function PlansPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<AdminPlan | "new" | null>(null);
  const query = useQuery({ queryKey: PLANS_KEY, queryFn: adminApi.plans });

  const onError = (error: unknown) =>
    toast.error(
      error instanceof ApiError ? error.message : "Something went wrong.",
    );
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["admin", "plan-options"] });
  const sync = useMutation({
    mutationFn: adminApi.syncPlans,
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: PLANS_KEY });
      toast.success(
        result.plans_updated
          ? `Stripe is up to date. ${result.plans_updated} plan${result.plans_updated === 1 ? "" : "s"} synced.`
          : "Everything is already in Stripe.",
      );
    },
    onError,
  });
  const toggleActive = useMutation({
    mutationFn: (plan: AdminPlan) =>
      adminApi.updatePlan(plan.key, { is_active: !plan.is_active }),
    onSuccess: (plan) => {
      void queryClient.invalidateQueries({ queryKey: PLANS_KEY });
      void refresh();
      toast.success(
        plan.is_active
          ? `${plan.name} is back on sale.`
          : `${plan.name} is archived. Current members keep it.`,
      );
    },
    onError,
  });
  const remove = useMutation({
    mutationFn: (plan: AdminPlan) => adminApi.deletePlan(plan.key),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PLANS_KEY });
      void refresh();
      toast.success("Plan deleted.");
    },
    onError,
  });

  const unsynced = query.data?.some((plan) => !plan.stripe_synced) ?? false;

  return (
    <>
      <PageHeader
        title="Plans & pricing"
        description="The membership plans installers can buy. Changes show on the website and in installers' dashboards straight away."
        actions={
          <>
            {unsynced ? (
              <Button
                variant="outline"
                icon={<CloudUpload aria-hidden className="size-4" />}
                loading={sync.isPending}
                onClick={() => sync.mutate()}
              >
                Sync with Stripe
              </Button>
            ) : null}
            <Button
              icon={<Plus aria-hidden className="size-4" />}
              onClick={() => setEditing("new")}
            >
              New plan
            </Button>
          </>
        }
      />

      {unsynced ? (
        <Notice tone="warning" className="mb-4">
          Some plans aren't in Stripe yet, so installers can't buy them. They're
          added automatically when a Stripe key is set and you sync, or when
          someone first buys the plan.
        </Notice>
      ) : null}

      <Card>
        {query.isPending ? (
          <PageLoader />
        ) : query.isError ? (
          <ErrorState
            error={query.error}
            onRetry={() => void query.refetch()}
          />
        ) : query.data.length === 0 ? (
          <EmptyState title="No plans yet" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Plan</Th>
                <Th>Price</Th>
                <Th>What it includes</Th>
                <Th>Members</Th>
                <Th>Stripe</Th>
                <Th>
                  <span className="sr-only">Actions</span>
                </Th>
              </tr>
            </thead>
            <tbody>
              {query.data.map((plan) => (
                <Tr
                  key={plan.key}
                  className={plan.is_active ? "" : "opacity-70"}
                >
                  <Td>
                    <p className="flex flex-wrap items-center gap-1.5 font-semibold text-ink">
                      {plan.name}
                      {plan.is_default ? <Badge>Default</Badge> : null}
                      {plan.is_popular ? (
                        <Badge tone="green">Popular</Badge>
                      ) : null}
                      {!plan.is_active ? (
                        <Badge tone="amber">Archived</Badge>
                      ) : null}
                    </p>
                    <p className="text-xs text-subtle">{plan.key}</p>
                  </Td>
                  <Td className="whitespace-nowrap">
                    {plan.price_pence !== null ? (
                      <span className="font-semibold text-ink">
                        {formatPence(plan.price_pence, plan.currency)}
                        <span className="font-normal text-muted"> /month</span>
                      </span>
                    ) : (
                      <span className="text-subtle">
                        {plan.is_default ? "Free" : "Not for sale"}
                      </span>
                    )}
                  </Td>
                  <Td>
                    <ul className="space-y-0.5 text-xs">
                      <li>
                        {plan.receives_leads
                          ? "Full access to enquiries"
                          : "Told about enquiries, upgrade to respond"}
                      </li>
                      <li>
                        {plan.public_service_limit === null
                          ? "Every service shown"
                          : `First ${plan.public_service_limit} service${plan.public_service_limit === 1 ? "" : "s"} shown`}
                        {plan.full_public_profile ? ", full profile" : ""}
                      </li>
                      <li>
                        {plan.max_gallery_photos > 0
                          ? `${plan.max_gallery_photos} gallery photos`
                          : "No gallery"}
                        {plan.accepts_direct_quotes ? ", direct quotes" : ""}
                      </li>
                    </ul>
                  </Td>
                  <Td className="whitespace-nowrap">
                    <p>{formatNumber(plan.installers)} on plan</p>
                    {plan.subscriptions > 0 ? (
                      <p className="text-xs text-subtle">
                        {formatNumber(plan.subscriptions)} paying
                      </p>
                    ) : null}
                  </Td>
                  <Td>
                    {plan.price_pence === null ? (
                      <span className="text-subtle">—</span>
                    ) : plan.stripe_synced ? (
                      <Badge tone="green">Synced</Badge>
                    ) : (
                      <Badge tone="amber">Not synced</Badge>
                    )}
                  </Td>
                  <Td>
                    <div className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        icon={<Pencil aria-hidden className="size-3.5" />}
                        onClick={() => setEditing(plan)}
                      >
                        Edit
                      </Button>
                      {!plan.is_default ? (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            loading={
                              toggleActive.isPending &&
                              toggleActive.variables?.key === plan.key
                            }
                            onClick={() => toggleActive.mutate(plan)}
                          >
                            {plan.is_active ? "Archive" : "Restore"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:bg-red-50"
                            aria-label={`Delete ${plan.name}`}
                            icon={<Trash2 aria-hidden className="size-3.5" />}
                            loading={
                              remove.isPending &&
                              remove.variables?.key === plan.key
                            }
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Delete the ${plan.name} plan? This cannot be undone. If anyone is on it, archive it instead.`,
                                )
                              )
                                remove.mutate(plan);
                            }}
                          />
                        </>
                      ) : null}
                    </div>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <PlanDrawer
        plan={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          void queryClient.invalidateQueries({ queryKey: PLANS_KEY });
          void refresh();
        }}
      />
    </>
  );
}

function PlanDrawer({
  plan,
  onClose,
  onSaved,
}: {
  plan: AdminPlan | "new" | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const id = useId();
  const toast = useToast();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const existing = plan && plan !== "new" ? plan : null;
  const save = useMutation({
    mutationFn: (body: AdminPlanInput & { key: string }) => {
      if (!existing) return adminApi.createPlan(body);
      // The key never changes, and the API refuses it in an edit.
      const { key: _key, ...changes } = body;
      return adminApi.updatePlan(existing.key, changes);
    },
    onSuccess: (saved) => {
      setErrors({});
      toast.success(existing ? `${saved.name} saved.` : `${saved.name} added.`);
      onSaved();
    },
    onError: (error) => {
      const fields = error instanceof ApiError ? (error.fields ?? {}) : {};
      setErrors(fields);
      if (!Object.keys(fields).length)
        toast.error(
          error instanceof ApiError ? error.message : "Couldn't save the plan.",
        );
    },
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const price = existing?.is_default ? null : toPence(text(form, "price"));
    if (Number.isNaN(price)) {
      setErrors({ price_pence: "Enter a price like 29 or 29.50." });
      return;
    }
    const limit = text(form, "public_service_limit");
    save.mutate({
      key: text(form, "key"),
      name: text(form, "name"),
      tagline: text(form, "tagline") || null,
      features: text(form, "features")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
      is_active: form.has("is_active"),
      is_popular: form.has("is_popular"),
      sort_rank: Number(form.get("sort_rank") || 0),
      receives_leads: form.has("receives_leads"),
      accepts_direct_quotes: form.has("accepts_direct_quotes"),
      full_public_profile: form.has("full_public_profile"),
      public_service_limit: limit ? Number(limit) : null,
      max_gallery_photos: Number(form.get("max_gallery_photos") || 0),
      price_pence: price,
    });
  }

  const formId = `${id}-form`;
  return (
    <Drawer
      open={plan !== null}
      onClose={onClose}
      title={existing ? `Edit ${existing.name}` : "New plan"}
      description="Saved plans are created in Stripe automatically."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={save.isPending}>
            {existing ? "Save changes" : "Add plan"}
          </Button>
        </>
      }
    >
      <form
        key={existing?.key ?? "new"}
        id={formId}
        onSubmit={onSubmit}
        className="space-y-4"
        noValidate
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" htmlFor={`${id}-name`} error={errors.name}>
            <Input
              id={`${id}-name`}
              name="name"
              required
              maxLength={60}
              defaultValue={existing?.name}
            />
          </Field>
          <Field
            label="Key"
            htmlFor={`${id}-key`}
            error={errors.key}
            hint={
              existing
                ? "The key can't be changed."
                : "Lower-case letters, numbers and dashes, e.g. business."
            }
          >
            <Input
              id={`${id}-key`}
              name="key"
              required
              maxLength={40}
              pattern="[a-z][a-z0-9\-]*[a-z0-9]"
              defaultValue={existing?.key}
              readOnly={!!existing}
            />
          </Field>
        </div>
        <Field
          label="Tagline"
          htmlFor={`${id}-tagline`}
          error={errors.tagline}
          hint="One line under the plan name."
        >
          <Input
            id={`${id}-tagline`}
            name="tagline"
            maxLength={200}
            defaultValue={existing?.tagline ?? ""}
          />
        </Field>
        {existing?.is_default ? (
          <Notice tone="info">
            The default plan is always free. New and expired members land on it.
          </Notice>
        ) : (
          <Field
            label="Monthly price (£)"
            htmlFor={`${id}-price`}
            error={errors.price_pence}
            hint={
              existing?.price_pence != null
                ? "A new price applies to new subscribers. Current members keep the price they signed up at."
                : "Leave blank to keep the plan off sale."
            }
          >
            <Input
              id={`${id}-price`}
              name="price"
              inputMode="decimal"
              placeholder="29"
              defaultValue={
                existing?.price_pence != null
                  ? String(existing.price_pence / 100)
                  : ""
              }
            />
          </Field>
        )}
        <Field
          label="What's included"
          htmlFor={`${id}-features`}
          error={errors.features}
          hint="One benefit per line, up to 12. Shown on the website and in installers' dashboards."
        >
          <Textarea
            id={`${id}-features`}
            name="features"
            rows={6}
            defaultValue={existing?.features.join("\n")}
          />
        </Field>

        <fieldset className="space-y-3 rounded-xl border border-line p-4">
          <legend className="px-1 text-[13px] font-semibold text-ink">
            What the plan allows
          </legend>
          <Checkbox
            name="receives_leads"
            defaultChecked={existing?.receives_leads ?? false}
            label="Full access to enquiries (see details, reply and quote)"
          />
          <Checkbox
            name="accepts_direct_quotes"
            defaultChecked={existing?.accepts_direct_quotes ?? false}
            label="Direct quote requests from the installer's profile"
          />
          <Checkbox
            name="full_public_profile"
            defaultChecked={existing?.full_public_profile ?? false}
            label="Full public profile (accreditations, photos, every detail)"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Services shown publicly"
              htmlFor={`${id}-limit`}
              error={errors.public_service_limit}
              hint="Blank = every service."
            >
              <Input
                id={`${id}-limit`}
                name="public_service_limit"
                type="number"
                min={1}
                max={20}
                defaultValue={existing?.public_service_limit ?? ""}
              />
            </Field>
            <Field
              label="Gallery photos"
              htmlFor={`${id}-photos`}
              error={errors.max_gallery_photos}
              hint="0 = no gallery."
            >
              <Input
                id={`${id}-photos`}
                name="max_gallery_photos"
                type="number"
                min={0}
                max={100}
                defaultValue={existing?.max_gallery_photos ?? 0}
              />
            </Field>
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Order"
            htmlFor={`${id}-rank`}
            error={errors.sort_rank}
            hint="Lowest first. Also ranks installers in listings."
          >
            <Input
              id={`${id}-rank`}
              name="sort_rank"
              type="number"
              min={0}
              max={1000}
              defaultValue={existing?.sort_rank ?? 10}
            />
          </Field>
          <div className="space-y-3 pt-6">
            <Checkbox
              name="is_popular"
              defaultChecked={existing?.is_popular ?? false}
              label="Highlight as Most popular"
            />
            {!existing?.is_default ? (
              <Checkbox
                name="is_active"
                defaultChecked={existing?.is_active ?? true}
                label="On sale"
              />
            ) : null}
          </div>
        </div>
      </form>
    </Drawer>
  );
}
