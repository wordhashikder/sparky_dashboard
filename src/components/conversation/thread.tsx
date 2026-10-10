import { FileText, Mail, Phone } from "lucide-react";
import type { ReactNode } from "react";
import { Badge, statusTone } from "@/components/ui/badge";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";
import { offerStatusLabels } from "@/lib/labels";
import type {
  ConversationDetail,
  ConversationMessage,
  Offer,
} from "@/lib/types";
import { cn } from "@/lib/utils";

type Entry =
  | { kind: "message"; at: string; item: ConversationMessage }
  | { kind: "offer"; at: string; item: Offer };

/** Messages and quotes in the order they happened. */
export function timeline(detail: ConversationDetail): Entry[] {
  return [
    ...detail.messages.map(
      (item): Entry => ({ kind: "message", at: item.created_at, item }),
    ),
    ...detail.offers.map(
      (item): Entry => ({ kind: "offer", at: item.created_at, item }),
    ),
  ].sort((a, b) => a.at.localeCompare(b.at));
}

/** Who the homeowner is and what they asked for. */
export function JobSummary({ detail }: { detail: ConversationDetail }) {
  const { job } = detail;
  return (
    <details className="group rounded-xl border border-line bg-surface px-4 py-3">
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-1 text-sm [&::-webkit-details-marker]:hidden">
        <span className="font-semibold text-ink">
          {job.kind === "lead" ? "Quote request" : "Direct enquiry"}
          {job.reference ? ` ${job.reference}` : ""}
        </span>
        <span className="text-xs">{formatDate(job.created_at)}</span>
        {detail.homeowner_email ? (
          <a
            href={`mailto:${detail.homeowner_email}`}
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <Mail aria-hidden className="size-3.5" />
            {detail.homeowner_email}
          </a>
        ) : null}
        {job.phone ? (
          <a
            href={`tel:${job.phone.replace(/\s+/g, "")}`}
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <Phone aria-hidden className="size-3.5" />
            {job.phone}
          </a>
        ) : null}
        <span className="ml-auto text-xs text-primary group-open:hidden">
          Show details
        </span>
        <span className="ml-auto hidden text-xs text-primary group-open:inline">
          Hide details
        </span>
      </summary>
      {job.summary.length > 0 ? (
        <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1.5 text-[13px] sm:grid-cols-[160px_1fr]">
          {job.summary.map(([question, answer]) => (
            <div key={question} className="contents">
              <dt className="text-subtle">{question}</dt>
              <dd className="text-ink">{answer}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {job.message && job.summary.length === 0 ? (
        <p className="mt-3 text-[13px] whitespace-pre-line text-ink">
          {job.message}
        </p>
      ) : null}
    </details>
  );
}

export function MessageBubble({
  message,
  installerName,
  homeownerName,
}: {
  message: ConversationMessage;
  installerName: string;
  homeownerName: string;
}) {
  if (message.sender === "system") {
    return (
      <p className="mx-auto max-w-[520px] rounded-full bg-ink/5 px-4 py-1.5 text-center text-xs whitespace-pre-line">
        {message.body} · {formatDateTime(message.created_at)}
      </p>
    );
  }
  const mine = message.sender === "installer";
  const author =
    message.sender === "installer"
      ? installerName
      : message.sender === "team"
        ? "PickASparky team"
        : homeownerName;
  return (
    <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-2.5",
          mine
            ? "rounded-br-sm bg-primary text-white"
            : "rounded-bl-sm border border-line bg-white text-ink",
        )}
      >
        <p
          className={cn(
            "text-[11px] font-semibold",
            mine ? "text-white/80" : "text-subtle",
          )}
        >
          {author} · {formatDateTime(message.created_at)}
        </p>
        <p className="mt-0.5 text-sm leading-relaxed whitespace-pre-line">
          {message.body}
        </p>
      </div>
    </div>
  );
}

export function OfferCard({
  offer,
  actions,
}: {
  offer: Offer;
  actions?: ReactNode;
}) {
  return (
    <article className="mx-auto w-full max-w-[520px] rounded-xl border border-[#e3efec] bg-mint-soft p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-forest uppercase">
          <FileText aria-hidden className="size-3.5" />
          Quote {offer.reference}
        </p>
        <Badge tone={statusTone[offer.status]}>
          {offerStatusLabels[offer.status]}
        </Badge>
      </div>
      <p className="mt-2 text-2xl font-bold text-ink">
        {formatMoney(offer.amount)}{" "}
        <span className="text-xs font-normal">
          {offer.includes_vat ? "inc. VAT" : "ex. VAT"}
        </span>
      </p>
      <p className="mt-2 text-[13px] whitespace-pre-line text-ink">
        {offer.description}
      </p>
      <p className="mt-2 text-xs text-subtle">
        Sent {formatDateTime(offer.created_at)}
        {offer.valid_until
          ? ` · valid until ${formatDate(offer.valid_until)}`
          : ""}
        {offer.responded_at
          ? ` · answered ${formatDateTime(offer.responded_at)}`
          : ""}
      </p>
      {offer.response_note ? (
        <p className="mt-2 rounded-lg bg-white px-3 py-2 text-[13px]">
          Customer's note: {offer.response_note}
        </p>
      ) : null}
      {actions ? <div className="mt-3 flex justify-end">{actions}</div> : null}
    </article>
  );
}

/** The whole history; `offerActions` adds buttons to each quote (installer only). */
export function Timeline({
  detail,
  offerActions,
}: {
  detail: ConversationDetail;
  offerActions?: (offer: Offer) => ReactNode;
}) {
  const entries = timeline(detail);
  if (entries.length === 0) {
    return (
      <p className="py-10 text-center text-sm">
        No messages yet. Introduce yourself or send a quote.
      </p>
    );
  }
  return (
    <ol className="space-y-3" aria-label="Messages and quotes">
      {entries.map((entry) => (
        <li key={`${entry.kind}-${entry.item.id}`}>
          {entry.kind === "message" ? (
            <MessageBubble
              message={entry.item}
              installerName={detail.installer_name}
              homeownerName={detail.homeowner_name}
            />
          ) : (
            <OfferCard
              offer={entry.item}
              actions={offerActions?.(entry.item)}
            />
          )}
        </li>
      ))}
    </ol>
  );
}
