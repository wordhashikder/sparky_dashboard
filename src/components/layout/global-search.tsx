import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  FileText,
  MapPin,
  MessageSquare,
  Search,
} from "lucide-react";
import { type KeyboardEvent, useEffect, useId, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { adminApi } from "@/lib/endpoints";
import type { SearchHit } from "@/lib/types";
import { useDebounced } from "@/lib/use-debounced";
import { cn } from "@/lib/utils";

const kindIcons = {
  installer: Building2,
  lead: FileText,
  location: MapPin,
  conversation: MessageSquare,
} as const;

const kindLabels = {
  installer: "Installer",
  lead: "Lead",
  location: "Location",
  conversation: "Conversation",
} as const;

/**
 * Top bar search across installers, leads, locations and conversations (only
 * the areas the member's role includes). Press "/" to focus it.
 */
export function GlobalSearch() {
  const navigate = useNavigate();
  const listId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const term = useDebounced(value.trim(), 250);

  const query = useQuery({
    queryKey: ["admin", "search", term],
    queryFn: ({ signal }) => adminApi.search(term, signal),
    enabled: term.length >= 2,
    staleTime: 15_000,
  });
  const hits: SearchHit[] = term.length >= 2 ? (query.data?.hits ?? []) : [];

  useEffect(() => {
    function onKey(event: globalThis.KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);
      if (event.key === "/" && !typing) {
        event.preventDefault();
        input.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset on new results
  useEffect(() => setActive(0), [term]);

  function go(hit: SearchHit) {
    setOpen(false);
    setValue("");
    input.current?.blur();
    navigate(hit.href);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setOpen(false);
      input.current?.blur();
    } else if (event.key === "ArrowDown" && hits.length) {
      event.preventDefault();
      setActive((index) => (index + 1) % hits.length);
    } else if (event.key === "ArrowUp" && hits.length) {
      event.preventDefault();
      setActive((index) => (index - 1 + hits.length) % hits.length);
    } else if (event.key === "Enter" && hits[active]) {
      event.preventDefault();
      go(hits[active]);
    }
  }

  const showPanel = open && term.length >= 2;

  return (
    <div className="relative w-full max-w-[460px]">
      <Search
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-subtle"
      />
      <input
        ref={input}
        type="search"
        role="combobox"
        aria-expanded={showPanel}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={
          showPanel && hits[active] ? `${listId}-${active}` : undefined
        }
        aria-label="Search installers, leads, locations and conversations"
        placeholder="Search installers, leads, locations…"
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        onKeyDown={onKeyDown}
        className="h-10 w-full rounded-xl border border-line bg-canvas pr-10 pl-10 text-sm text-ink outline-none placeholder:text-subtle focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/15"
      />
      <kbd className="pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 rounded border border-line bg-white px-1.5 text-[11px] text-subtle sm:block">
        /
      </kbd>
      {showPanel ? (
        <div className="absolute top-12 right-0 left-0 z-50 overflow-hidden rounded-xl border border-line bg-white shadow-float">
          {query.isFetching && hits.length === 0 ? (
            <p className="px-4 py-3 text-sm">Searching…</p>
          ) : hits.length === 0 ? (
            <p className="px-4 py-3 text-sm">No matches for “{term}”.</p>
          ) : (
            <div
              id={listId}
              role="listbox"
              className="max-h-96 overflow-y-auto py-1"
            >
              {hits.map((hit, index) => {
                const Icon = kindIcons[hit.kind];
                return (
                  <div
                    key={`${hit.kind}-${hit.id}`}
                    id={`${listId}-${index}`}
                    role="option"
                    tabIndex={-1}
                    aria-selected={index === active}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      go(hit);
                    }}
                    onMouseEnter={() => setActive(index)}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 px-4 py-2.5",
                      index === active && "bg-mint-soft",
                    )}
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-canvas text-ink">
                      <Icon aria-hidden className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink">
                        {hit.title}
                      </span>
                      <span className="block truncate text-xs text-subtle">
                        {hit.subtitle}
                      </span>
                    </span>
                    <span className="text-[11px] font-medium text-subtle">
                      {kindLabels[hit.kind]}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
