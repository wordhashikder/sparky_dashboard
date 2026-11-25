import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ExternalLink,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { type FormEvent, useId, useState } from "react";
import { Link } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Drawer } from "@/components/ui/drawer";
import { Field, Input, Notice, Textarea } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, ErrorState, PageLoader } from "@/components/ui/states";
import { Toggle } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api";
import { adminApi } from "@/lib/endpoints";
import type { AdminAccreditationScheme } from "@/lib/types";

/**
 * The accreditation schemes installers can list (NICEIC, TrustMark, SELECT ...): the name,
 * the small badge, and the wording on the profile card. Each scheme also gets its own page.
 */
export default function AccreditationSchemesPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [editing, setEditing] = useState<
    AdminAccreditationScheme | "new" | null
  >(null);
  const query = useQuery({
    queryKey: ["admin", "accreditation-schemes"],
    queryFn: adminApi.accreditationSchemes,
  });

  const refresh = () => {
    void queryClient.invalidateQueries({
      queryKey: ["admin", "accreditation-schemes"],
    });
    void queryClient.invalidateQueries({ queryKey: ["accreditation-schemes"] });
    void queryClient.invalidateQueries({ queryKey: ["admin", "pages"] });
  };
  const toggle = useMutation({
    mutationFn: (scheme: AdminAccreditationScheme) =>
      adminApi.updateAccreditationScheme(scheme.key, {
        is_active: !scheme.is_active,
      }),
    onSuccess: refresh,
    onError: (error) =>
      toast.error(
        error instanceof ApiError ? error.message : "Couldn't update it.",
      ),
  });
  const remove = useMutation({
    mutationFn: (scheme: AdminAccreditationScheme) =>
      adminApi.deleteAccreditationScheme(scheme.key),
    onSuccess: () => {
      refresh();
      toast.success("Scheme deleted.");
    },
    onError: (error) =>
      toast.error(
        error instanceof ApiError ? error.message : "Couldn't delete it.",
      ),
  });

  return (
    <>
      <Link
        to="/content"
        className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-ink hover:underline"
      >
        <ArrowLeft aria-hidden className="size-4" /> Website content
      </Link>
      <PageHeader
        title="Accreditation schemes"
        description="The schemes installers can list on their profile. The card on a profile shows the badge, title and text below; the “About …” link appears once the scheme's page has content."
        actions={
          <Button
            onClick={() => setEditing("new")}
            icon={<Plus aria-hidden className="size-4" />}
          >
            Add a scheme
          </Button>
        }
      />
      {query.isPending ? (
        <PageLoader />
      ) : query.isError ? (
        <Card>
          <ErrorState
            error={query.error}
            onRetry={() => void query.refetch()}
          />
        </Card>
      ) : query.data.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ShieldCheck aria-hidden className="size-6" />}
            title="No schemes yet"
            action={
              <Button onClick={() => setEditing("new")}>Add a scheme</Button>
            }
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-line">
            {query.data.map((scheme) => (
              <li
                key={scheme.key}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4"
              >
                <div className="min-w-0 flex-1 basis-64">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">
                    {scheme.name}
                    {scheme.badge ? (
                      <Badge tone="green">{scheme.badge}</Badge>
                    ) : null}
                    {scheme.is_active ? null : <Badge>Off</Badge>}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-subtle">
                    {scheme.card_title} · {scheme.installer_count}{" "}
                    {scheme.installer_count === 1 ? "installer" : "installers"}
                  </p>
                </div>
                {scheme.page_id ? (
                  <Link
                    to={`/content/pages/${scheme.page_id}`}
                    className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary hover:underline"
                  >
                    {scheme.page_has_content && scheme.page_published
                      ? "Edit its page"
                      : "Add its page content"}
                    {scheme.page_has_content && scheme.page_published ? (
                      <Badge tone="green">Live</Badge>
                    ) : null}
                  </Link>
                ) : null}
                {scheme.href ? (
                  <a
                    href={scheme.href}
                    target="_blank"
                    rel="noreferrer"
                    className="sr-only"
                  >
                    <ExternalLink aria-hidden className="size-4" />
                  </a>
                ) : null}
                <div className="flex items-center gap-2">
                  <Toggle
                    on={scheme.is_active}
                    disabled={toggle.isPending}
                    label={`${scheme.name} is on offer to installers`}
                    onChange={() => toggle.mutate(scheme)}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Edit ${scheme.name}`}
                    onClick={() => setEditing(scheme)}
                  >
                    <Pencil aria-hidden className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-red-600 hover:bg-red-50"
                    aria-label={`Delete ${scheme.name}`}
                    disabled={scheme.installer_count > 0}
                    title={
                      scheme.installer_count > 0
                        ? "Installers list this scheme. Switch it off instead."
                        : undefined
                    }
                    onClick={() => {
                      if (
                        window.confirm(
                          `Delete ${scheme.name}? Its page is deleted too.`,
                        )
                      )
                        remove.mutate(scheme);
                    }}
                  >
                    <Trash2 aria-hidden className="size-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
      <p className="mt-3 text-xs text-subtle">
        Switching a scheme off stops installers choosing it; installers who
        already hold it keep it. Schemes in use cannot be deleted.
      </p>
      <SchemeDrawer
        scheme={editing}
        onClose={() => setEditing(null)}
        onSaved={refresh}
      />
    </>
  );
}

function SchemeDrawer({
  scheme,
  onClose,
  onSaved,
}: {
  scheme: AdminAccreditationScheme | "new" | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const id = useId();
  const toast = useToast();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const existing = scheme && scheme !== "new" ? scheme : null;

  const save = useMutation({
    mutationFn: (body: {
      name: string;
      badge: string | null;
      card_title: string;
      card_text: string;
    }) =>
      existing
        ? adminApi.updateAccreditationScheme(existing.key, body)
        : adminApi.createAccreditationScheme(body),
    onSuccess: () => {
      setErrors({});
      onSaved();
      toast.success(existing ? "Scheme saved." : "Scheme added with its page.");
      onClose();
    },
    onError: (error) => {
      if (error instanceof ApiError && error.fields) setErrors(error.fields);
      else
        toast.error(
          error instanceof ApiError ? error.message : "Couldn't save.",
        );
    },
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const read = (name: string) => String(form.get(name) ?? "").trim();
    save.mutate({
      name: read("name"),
      badge: read("badge") || null,
      card_title: read("card_title"),
      card_text: read("card_text"),
    });
  }

  return (
    <Drawer
      open={scheme !== null}
      onClose={() => {
        setErrors({});
        onClose();
      }}
      title={existing ? `Edit ${existing.name}` : "Add a scheme"}
      description="This is the wording on the card shown on installer profiles."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={`${id}-form`} loading={save.isPending}>
            {existing ? "Save" : "Add scheme"}
          </Button>
        </>
      }
    >
      {scheme !== null ? (
        <form
          id={`${id}-form`}
          key={existing?.key ?? "new"}
          onSubmit={onSubmit}
          className="space-y-4 px-6 py-5"
        >
          {errors.content ? (
            <Notice tone="error">{errors.content}</Notice>
          ) : null}
          <Field label="Name" htmlFor={`${id}-name`} error={errors.name}>
            <Input
              id={`${id}-name`}
              name="name"
              defaultValue={existing?.name ?? ""}
              maxLength={60}
              required
              placeholder="NICEIC"
            />
          </Field>
          <Field
            label="Badge (optional)"
            htmlFor={`${id}-badge`}
            error={errors.badge}
            hint="The small green label, e.g. “Recognised Standard”."
          >
            <Input
              id={`${id}-badge`}
              name="badge"
              defaultValue={existing?.badge ?? ""}
              maxLength={40}
            />
          </Field>
          <Field
            label="Card title"
            htmlFor={`${id}-card-title`}
            error={errors.card_title}
          >
            <Input
              id={`${id}-card-title`}
              name="card_title"
              defaultValue={existing?.card_title ?? ""}
              maxLength={80}
              required
              placeholder="NICEIC Approved"
            />
          </Field>
          <Field
            label="Card text"
            htmlFor={`${id}-card-text`}
            error={errors.card_text}
            hint="One or two sentences."
          >
            <Textarea
              id={`${id}-card-text`}
              name="card_text"
              defaultValue={existing?.card_text ?? ""}
              maxLength={400}
              rows={4}
              required
            />
          </Field>
          {existing ? null : (
            <p className="text-xs text-subtle">
              A page for this scheme is created automatically (empty and hidden
              from Google until you add content).
            </p>
          )}
        </form>
      ) : null}
    </Drawer>
  );
}
