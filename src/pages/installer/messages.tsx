import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { ArrowLeft, FileText, MessageSquare, Send } from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { QuoteForm } from "@/components/conversation/quote-form";
import { JobSummary, Timeline } from "@/components/conversation/thread";
import { UpgradeCard } from "@/components/installer/upgrade-card";
import { Badge, statusTone } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState, ErrorState, PageLoader } from "@/components/ui/states";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { Tabs } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api";
import { installerApi } from "@/lib/endpoints";
import { formatDate, formatMoney, timeAgo } from "@/lib/format";
import { offerStatusLabels } from "@/lib/labels";
import { cn } from "@/lib/utils";

type View = "all" | "unread" | "quotes";

export default function MessagesPage() {
  const { conversationId } = useParams();
  const [view, setView] = useState<View>("all");
  const summary = useQuery({
    queryKey: ["installer", "summary"],
    queryFn: installerApi.summary,
  });

  return (
    <>
      <PageHeader
        title="My Quotes & Messages"
        description="Every conversation with a customer and every quote you've sent, kept in one place."
      />
      {summary.data && !summary.data.receives_leads ? (
        <div className="mb-6">
          <UpgradeCard compact />
        </div>
      ) : null}
      <Tabs
        label="Show"
        value={view}
        onChange={setView}
        tabs={[
          { value: "all", label: "All conversations" },
          {
            value: "unread",
            label: "Unread",
            count: summary.data?.unread_conversations,
          },
          {
            value: "quotes",
            label: "Quotes sent",
            count: summary.data?.open_quotes,
          },
        ]}
      />
      {view === "quotes" ? (
        <QuotesTable />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
          <div className={cn(conversationId && "max-lg:hidden")}>
            <ConversationList
              unread={view === "unread"}
              activeId={conversationId}
            />
          </div>
          <div className={cn(!conversationId && "max-lg:hidden")}>
            {conversationId ? (
              <ConversationPanel id={conversationId} />
            ) : (
              <Card>
                <EmptyState
                  icon={
                    <MessageSquare
                      aria-hidden
                      className="size-6"
                      strokeWidth={1.75}
                    />
                  }
                  title="Choose a conversation"
                  text="Or start one from a lead: open New Leads and choose “Message & quote”."
                  action={
                    <ButtonLink to="/leads" variant="outline">
                      Go to New Leads
                    </ButtonLink>
                  }
                />
              </Card>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function ConversationList({
  unread,
  activeId,
}: {
  unread: boolean;
  activeId?: string;
}) {
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ["installer", "conversations", { page, unread }],
    queryFn: () => installerApi.conversations(page, unread),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });
  if (query.isPending)
    return (
      <Card>
        <PageLoader />
      </Card>
    );
  if (query.isError)
    return (
      <Card>
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      </Card>
    );
  const { items, total, pages } = query.data;

  return (
    <Card className="overflow-hidden">
      {items.length === 0 ? (
        <EmptyState
          title={unread ? "You're all caught up" : "No conversations yet"}
        />
      ) : (
        <ul className="divide-y divide-line">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                to={`/messages/${item.id}`}
                className={cn(
                  "block px-4 py-3.5 transition-colors hover:bg-surface",
                  item.id === activeId && "bg-mint-soft hover:bg-mint-soft",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <p
                    className={cn(
                      "truncate text-sm text-ink",
                      item.unread ? "font-bold" : "font-medium",
                    )}
                  >
                    {item.homeowner_name}
                  </p>
                  <span className="shrink-0 text-[11px] text-subtle">
                    {timeAgo(item.last_message_at)}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-[13px]">
                  {item.last_message ??
                    (item.kind === "lead" ? "Quote request" : "Direct enquiry")}
                </p>
                <div className="mt-1.5 flex items-center gap-1.5">
                  {item.unread ? <Badge tone="blue">New reply</Badge> : null}
                  {item.latest_offer_status ? (
                    <Badge tone={statusTone[item.latest_offer_status]}>
                      Quote{" "}
                      {offerStatusLabels[
                        item.latest_offer_status
                      ].toLowerCase()}
                    </Badge>
                  ) : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Pagination
        page={page}
        pages={pages}
        total={total}
        onChange={setPage}
        noun="conversations"
      />
    </Card>
  );
}

function ConversationPanel({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const navigate = useNavigate();
  const [quoteOpen, setQuoteOpen] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const form = useRef<HTMLFormElement>(null);

  const query = useQuery({
    queryKey: ["installer", "conversation", id],
    queryFn: () => installerApi.conversation(id),
    refetchInterval: 30_000,
  });
  const count =
    (query.data?.messages.length ?? 0) + (query.data?.offers.length ?? 0);
  useEffect(() => {
    if (count) bottom.current?.scrollIntoView({ block: "nearest" });
  }, [count]);

  // Opening a conversation marks it read: refresh the counters.
  useEffect(() => {
    if (query.isSuccess) {
      void queryClient.invalidateQueries({
        queryKey: ["installer", "summary"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["installer", "conversations"],
      });
    }
  }, [query.isSuccess, queryClient]);

  const send = useMutation({
    mutationFn: (body: string) => installerApi.sendMessage(id, body),
    onSuccess: () => {
      form.current?.reset();
      void queryClient.invalidateQueries({ queryKey: ["installer"] });
    },
    onError: (error) =>
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Couldn't send the message.",
      ),
  });
  const withdraw = useMutation({
    mutationFn: installerApi.withdrawQuote,
    onSuccess: (offer) => {
      void queryClient.invalidateQueries({ queryKey: ["installer"] });
      toast.success(`Quote ${offer.reference} withdrawn.`);
    },
    onError: (error) =>
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Couldn't withdraw the quote.",
      ),
  });

  if (query.isPending)
    return (
      <Card>
        <PageLoader />
      </Card>
    );
  if (query.isError)
    return (
      <Card>
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      </Card>
    );
  const detail = query.data;

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = String(
      new FormData(event.currentTarget).get("body") ?? "",
    ).trim();
    if (body) send.mutate(body);
  }

  return (
    <Card className="flex flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => navigate("/messages")}
            aria-label="Back to conversations"
          >
            <ArrowLeft aria-hidden className="size-5" />
          </Button>
          <div className="min-w-0">
            <h2 className="truncate text-[15px] font-semibold">
              {detail.homeowner_name}
            </h2>
            <p className="text-xs text-subtle">
              Started {formatDate(detail.created_at)}
            </p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={() => setQuoteOpen(true)}
          icon={<FileText aria-hidden className="size-4" />}
        >
          Send a quote
        </Button>
      </header>
      <div className="space-y-4 px-5 py-4">
        <JobSummary detail={detail} />
        <div className="max-h-[56vh] min-h-48 overflow-y-auto rounded-xl bg-canvas/60 p-3">
          <Timeline
            detail={detail}
            offerActions={(offer) =>
              offer.status === "sent" ? (
                <Button
                  variant="outline"
                  size="sm"
                  loading={
                    withdraw.isPending && withdraw.variables === offer.id
                  }
                  onClick={() => {
                    if (window.confirm(`Withdraw quote ${offer.reference}?`))
                      withdraw.mutate(offer.id);
                  }}
                >
                  Withdraw
                </Button>
              ) : null
            }
          />
          <div ref={bottom} />
        </div>
        <form
          ref={form}
          onSubmit={onSubmit}
          className="flex flex-col gap-2 sm:flex-row sm:items-end"
        >
          <label htmlFor="message-body" className="sr-only">
            Message to {detail.homeowner_name}
          </label>
          <Textarea
            id="message-body"
            name="body"
            rows={2}
            maxLength={5000}
            placeholder={`Write to ${detail.homeowner_name}…`}
            className="min-h-12 flex-1"
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                event.currentTarget.form?.requestSubmit();
              }
            }}
          />
          <Button
            type="submit"
            loading={send.isPending}
            icon={<Send aria-hidden className="size-4" />}
          >
            Send
          </Button>
        </form>
        <p className="text-xs text-subtle">
          {detail.homeowner_name} is emailed a private link to read and reply.
          Press Ctrl+Enter to send.
        </p>
      </div>
      <QuoteForm
        conversationId={id}
        homeownerName={detail.homeowner_name}
        open={quoteOpen}
        onClose={() => setQuoteOpen(false)}
      />
    </Card>
  );
}

function QuotesTable() {
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ["installer", "quotes", page],
    queryFn: () => installerApi.quotes(page),
    placeholderData: keepPreviousData,
  });
  if (query.isPending) return <PageLoader />;
  if (query.isError)
    return (
      <ErrorState error={query.error} onRetry={() => void query.refetch()} />
    );
  const { items, total, pages } = query.data;
  return (
    <Card>
      {items.length === 0 ? (
        <EmptyState
          title="No quotes sent yet"
          text="Quotes you send from a conversation are listed here with their status."
        />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Quote</Th>
              <Th>Customer</Th>
              <Th>Price</Th>
              <Th>Status</Th>
              <Th>Sent</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {items.map((quote) => (
              <Tr key={quote.id}>
                <Td className="font-medium text-ink">{quote.reference}</Td>
                <Td>{quote.homeowner_name}</Td>
                <Td className="text-ink">
                  {formatMoney(quote.amount)}{" "}
                  <span className="text-xs text-subtle">
                    {quote.includes_vat ? "inc. VAT" : "ex. VAT"}
                  </span>
                </Td>
                <Td>
                  <Badge tone={statusTone[quote.status]}>
                    {offerStatusLabels[quote.status]}
                  </Badge>
                </Td>
                <Td>{formatDate(quote.created_at)}</Td>
                <Td className="text-right">
                  <Link
                    to={`/messages/${quote.conversation_id}`}
                    className="text-[13px] font-medium text-primary hover:underline"
                  >
                    Open
                  </Link>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
      <Pagination
        page={page}
        pages={pages}
        total={total}
        onChange={setPage}
        noun="quotes"
      />
    </Card>
  );
}
