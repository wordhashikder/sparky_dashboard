import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  ArrowLeft,
  ExternalLink,
  MessageSquare,
  Search,
  Send,
} from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { JobSummary, Timeline } from "@/components/conversation/thread";
import { Badge, statusTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState, ErrorState, PageLoader } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api";
import { siteLinks } from "@/lib/config";
import { adminApi } from "@/lib/endpoints";
import { formatDate, timeAgo } from "@/lib/format";
import { offerStatusLabels } from "@/lib/labels";
import { useDebounced } from "@/lib/use-debounced";
import { cn } from "@/lib/utils";

/**
 * Every conversation between installers and homeowners: the full history with
 * quotes, and a reply box to write in as the PickASparky team (both sides are
 * emailed and see it in their thread).
 */
export default function AdminMessagesPage() {
  const { conversationId } = useParams();
  return (
    <>
      <PageHeader
        title="Messages"
        description="Every conversation between installers and homeowners. Step in as the PickASparky team when needed."
      />
      <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
        <div className={cn(conversationId && "max-lg:hidden")}>
          <ConversationList activeId={conversationId} />
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
                text="Pick a conversation on the left to read its messages and quotes."
              />
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

function ConversationList({ activeId }: { activeId?: string }) {
  const [params, setParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState(params.get("q") ?? "");
  const kind = (params.get("kind") ?? "") as "lead" | "enquiry" | "";
  const installerId = params.get("installer") ?? undefined;
  const q = useDebounced(search);
  const query = useQuery({
    queryKey: ["admin", "conversations", { page, q, kind, installerId }],
    queryFn: () =>
      adminApi.conversations(page, { q, kind, installer_id: installerId }),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });

  function setKind(value: string) {
    const copy = new URLSearchParams(params);
    if (value) copy.set("kind", value);
    else copy.delete("kind");
    setParams(copy);
    setPage(1);
  }

  return (
    <Card className="overflow-hidden">
      <div className="space-y-2 border-b border-line p-3">
        <div className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle"
          />
          <label htmlFor="conversation-search" className="sr-only">
            Search conversations
          </label>
          <Input
            id="conversation-search"
            type="search"
            placeholder="Homeowner, email or installer"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="conversation-kind" className="sr-only">
            Job type
          </label>
          <Select
            id="conversation-kind"
            value={kind}
            onChange={(event) => setKind(event.target.value)}
            className="h-9 text-[13px]"
          >
            <option value="">All jobs</option>
            <option value="lead">Quote requests</option>
            <option value="enquiry">Profile enquiries</option>
          </Select>
          {installerId ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const copy = new URLSearchParams(params);
                copy.delete("installer");
                setParams(copy);
              }}
            >
              All installers
            </Button>
          ) : null}
        </div>
      </div>
      {query.isPending ? (
        <PageLoader />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : query.data.items.length === 0 ? (
        <EmptyState
          title="No conversations"
          text="When installers message homeowners or send quotes, the conversations appear here."
        />
      ) : (
        <ul className="max-h-[70vh] divide-y divide-line overflow-y-auto">
          {query.data.items.map((item) => (
            <li key={item.id}>
              <Link
                to={`/messages/${item.id}?${params.toString()}`}
                className={cn(
                  "block px-4 py-3.5 transition-colors hover:bg-surface",
                  item.id === activeId && "bg-mint-soft hover:bg-mint-soft",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-ink">
                    {item.homeowner_name}
                    <span className="font-normal text-subtle"> ↔ </span>
                    {item.installer_name}
                  </p>
                  <span className="shrink-0 text-[11px] text-subtle">
                    {timeAgo(item.last_message_at)}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-[13px]">
                  {item.last_sender === "team" ? "You: " : ""}
                  {item.last_message ??
                    (item.kind === "lead" ? "Quote request" : "Direct enquiry")}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <Badge tone="neutral">
                    {item.kind === "lead" ? "Quote request" : "Enquiry"}
                  </Badge>
                  {item.latest_offer_status ? (
                    <Badge tone={statusTone[item.latest_offer_status]}>
                      {item.offer_count} quote
                      {item.offer_count === 1 ? "" : "s"} ·{" "}
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
      {query.data ? (
        <Pagination
          page={page}
          pages={query.data.pages}
          total={query.data.total}
          onChange={setPage}
          noun="conversations"
        />
      ) : null}
    </Card>
  );
}

function ConversationPanel({ id }: { id: string }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const toast = useToast();
  const queryClient = useQueryClient();
  const bottom = useRef<HTMLDivElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const query = useQuery({
    queryKey: ["admin", "conversation", id],
    queryFn: () => adminApi.conversation(id),
    refetchInterval: 30_000,
  });
  const count =
    (query.data?.messages.length ?? 0) + (query.data?.offers.length ?? 0);
  useEffect(() => {
    if (count) bottom.current?.scrollIntoView({ block: "nearest" });
  }, [count]);

  const send = useMutation({
    mutationFn: (body: string) => adminApi.teamMessage(id, body),
    onSuccess: () => {
      form.current?.reset();
      toast.success("Message sent. Both sides have been emailed.");
      void queryClient.invalidateQueries({
        queryKey: ["admin", "conversation", id],
      });
      void queryClient.invalidateQueries({
        queryKey: ["admin", "conversations"],
      });
    },
    onError: (error) =>
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Couldn't send the message.",
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
    if (!body) return;
    if (
      window.confirm(
        `Send this as the PickASparky team? ${detail.homeowner_name} and ${detail.installer_name} will both be emailed.`,
      )
    )
      send.mutate(body);
  }

  return (
    <Card className="flex flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => navigate(`/messages?${params.toString()}`)}
            aria-label="Back to conversations"
          >
            <ArrowLeft aria-hidden className="size-5" />
          </Button>
          <div className="min-w-0">
            <h2 className="truncate text-[15px] font-semibold">
              {detail.homeowner_name} ↔ {detail.installer_name}
            </h2>
            <p className="text-xs text-subtle">
              Started {formatDate(detail.created_at)}
            </p>
          </div>
        </div>
        <a
          href={siteLinks.installer(detail.installer_slug)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-primary hover:underline"
        >
          Installer profile <ExternalLink aria-hidden className="size-3.5" />
        </a>
      </header>
      <div className="space-y-4 px-5 py-4">
        <JobSummary detail={detail} />
        <div className="max-h-[56vh] min-h-48 overflow-y-auto rounded-xl bg-canvas/60 p-3">
          <Timeline detail={detail} perspective="team" />
          <div ref={bottom} />
        </div>
        <form
          ref={form}
          onSubmit={onSubmit}
          className="flex flex-col gap-2 sm:flex-row sm:items-end"
        >
          <label htmlFor="team-message" className="sr-only">
            Message as the PickASparky team
          </label>
          <Textarea
            id="team-message"
            name="body"
            rows={2}
            maxLength={4000}
            placeholder="Write to both sides as the PickASparky team…"
            className="min-h-12 flex-1"
          />
          <Button
            type="submit"
            variant="dark"
            loading={send.isPending}
            icon={<Send aria-hidden className="size-4" />}
          >
            Send as team
          </Button>
        </form>
        <p className="text-xs text-subtle">
          Team messages appear in both threads and are emailed to the homeowner
          and the installer.
        </p>
      </div>
    </Card>
  );
}
