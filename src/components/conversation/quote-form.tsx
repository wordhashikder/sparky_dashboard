import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Checkbox, Field, Input, Notice, Textarea } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api";
import { installerApi } from "@/lib/endpoints";
import { answer } from "@/lib/labels";
import type { Lead } from "@/lib/types";

/** "Send a quote": a priced offer the homeowner can accept or decline. */
export function QuoteForm({
  conversationId,
  homeownerName,
  lead,
  open,
  onClose,
}: {
  conversationId: string;
  homeownerName: string;
  /** The lead being quoted: its summary and the slots left are shown above the form. */
  lead?: Lead;
  open: boolean;
  onClose: () => void;
}) {
  const id = useId();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const send = useMutation({
    mutationFn: (body: Parameters<typeof installerApi.sendQuote>[1]) =>
      installerApi.sendQuote(conversationId, body),
    onSuccess: (offer) => {
      void queryClient.invalidateQueries({ queryKey: ["installer"] });
      toast.success(`Quote ${offer.reference} sent to ${homeownerName}.`);
      onClose();
    },
    onError: (error) => {
      if (error instanceof ApiError && error.fields) setErrors(error.fields);
      else
        toast.error(
          error instanceof ApiError
            ? error.message
            : "Couldn't send the quote.",
        );
    },
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const amount = String(form.get("amount") ?? "").trim();
    const description = String(form.get("description") ?? "").trim();
    const found: Record<string, string> = {};
    if (!/^\d+(\.\d{1,2})?$/.test(amount) || Number(amount) <= 0) {
      found.amount = "Enter the price in pounds, e.g. 949 or 949.50.";
    }
    if (description.length < 10)
      found.description = "Describe what the price includes.";
    setErrors(found);
    if (Object.keys(found).length) return;
    send.mutate({
      amount,
      includes_vat: form.get("includes_vat") === "on",
      description,
      valid_until: String(form.get("valid_until") ?? "") || null,
      message: String(form.get("message") ?? "").trim() || null,
    });
  }

  const today = new Date().toISOString().slice(0, 10);
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={lead ? "Submit Quote to Homeowner" : "Send a quote"}
      description={`${homeownerName} sees your quote in their quote dashboard and can accept or decline it there.`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={id} loading={send.isPending}>
            {lead ? "Submit Quote to Homeowner" : "Send quote"}
          </Button>
        </>
      }
    >
      <form id={id} onSubmit={onSubmit} className="space-y-5" noValidate>
        {lead ? <LeadSummary lead={lead} /> : null}
        {errors.__root__ ? (
          <Notice tone="error">{errors.__root__}</Notice>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Estimated price (£)"
            htmlFor={`${id}-amount`}
            error={errors.amount}
          >
            <Input
              id={`${id}-amount`}
              name="amount"
              inputMode="decimal"
              placeholder="949.00"
              required
              aria-invalid={errors.amount ? true : undefined}
            />
          </Field>
          <Field
            label="Valid until (optional)"
            htmlFor={`${id}-valid`}
            error={errors.valid_until}
          >
            <Input
              id={`${id}-valid`}
              name="valid_until"
              type="date"
              min={today}
            />
          </Field>
        </div>
        <Checkbox
          name="includes_vat"
          defaultChecked
          label="The price includes VAT"
        />
        <Field
          label="Your proposal: what's included"
          htmlFor={`${id}-description`}
          error={errors.description}
          hint="Charger model, cable run, any consumer-unit work, testing and certificate."
        >
          <Textarea
            id={`${id}-description`}
            name="description"
            rows={6}
            maxLength={5000}
            required
            aria-invalid={errors.description ? true : undefined}
          />
        </Field>
        <Field
          label="Introduction message (optional)"
          htmlFor={`${id}-message`}
          error={errors.message}
        >
          <Textarea
            id={`${id}-message`}
            name="message"
            rows={3}
            maxLength={2000}
          />
        </Field>
      </form>
    </Drawer>
  );
}

/** The request being quoted, the homeowner's notes and how many quote slots are left. */
function LeadSummary({ lead }: { lead: Lead }) {
  const q = lead.quote;
  const progress = lead.progress;
  const left = progress
    ? Math.max(0, progress.slots_total - progress.responders)
    : null;
  const rows: [string, string][] = [
    ["Postcode", q.postcode],
    ["Job", answer(q.installation_type)],
    ["Charger location", answer(q.charger_location, "ChargerLocation")],
    ["Fuse box", answer(q.fuse_box_distance)],
    ["Vehicle", q.vehicle ?? (q.vehicle_undecided ? "Not chosen yet" : "-")],
    ["Timing", answer(q.timing)],
  ];
  return (
    <section aria-label="Request summary" className="space-y-3">
      {progress && left !== null ? (
        <p
          role="status"
          className="rounded-xl border border-[#f5d58a] bg-[#fff8e6] px-4 py-3 text-[13px] text-[#7a5300]"
        >
          <span className="font-semibold">Be quick!</span> Only the first{" "}
          {progress.slots_total} installers to respond can quote &mdash; {left}{" "}
          {left === 1 ? "slot" : "slots"} left.
        </p>
      ) : null}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 rounded-xl bg-cream p-4 text-[13px]">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="text-subtle">{label}</dt>
            <dd className="font-medium text-ink">{value}</dd>
          </div>
        ))}
      </dl>
      {q.notes ? (
        <div>
          <p className="text-xs font-semibold tracking-wide text-subtle uppercase">
            Notes from {q.first_name}
          </p>
          <p className="mt-1 rounded-lg bg-surface px-3 py-2 text-[13px] whitespace-pre-line text-ink">
            {q.notes}
          </p>
        </div>
      ) : null}
    </section>
  );
}
