import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Checkbox, Field, Input, Notice, Textarea } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api";
import { installerApi } from "@/lib/endpoints";

/** "Send a quote": a priced offer the homeowner can accept or decline. */
export function QuoteForm({
  conversationId,
  homeownerName,
  open,
  onClose,
}: {
  conversationId: string;
  homeownerName: string;
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
      title="Send a quote"
      description={`${homeownerName} can accept or decline it from their email link.`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={id} loading={send.isPending}>
            Send quote
          </Button>
        </>
      }
    >
      <form id={id} onSubmit={onSubmit} className="space-y-5" noValidate>
        {errors.__root__ ? (
          <Notice tone="error">{errors.__root__}</Notice>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Price (£)"
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
          label="What's included"
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
          label="Message (optional)"
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
