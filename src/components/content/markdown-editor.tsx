import {
  Bold,
  Eye,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Table2,
} from "lucide-react";
import {
  type ComponentProps,
  type KeyboardEvent,
  lazy,
  type ReactNode,
  Suspense,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/form";
import {
  checkAddress,
  type Edit,
  insertBlock,
  insertLink,
  type Selection,
  tableSnippet,
  toggleHeading,
  toggleInline,
  toggleList,
} from "@/lib/markdown-edit";
import { cn } from "@/lib/utils";
import { useImageUpload } from "./image-picker";
import type { PreviewKind } from "./markdown-preview";

const MarkdownPreview = lazy(() => import("./markdown-preview"));

export type LinkTarget = { path: string; title: string };

type Props = {
  id: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  maxLength?: number;
  /** `2`: separate Heading and Sub-heading buttons. `1`: the page shows one heading style. */
  headings?: 1 | 2;
  /** Show the Insert image button (only where the website shows pictures in the text). */
  images?: boolean;
  /** Pages of this site offered in the "Link to a page…" list. */
  linkTargets?: LinkTarget[];
  preview?: PreviewKind;
  defaultPreview?: boolean;
  invalid?: boolean;
  describedBy?: string;
};

type Panel = "link" | "table" | null;

function ToolButton({
  label,
  shortcut,
  onClick,
  pressed,
  busy,
  children,
}: {
  label: string;
  shortcut?: string;
  onClick: () => void;
  pressed?: boolean;
  busy?: boolean;
  children: ReactNode;
}) {
  const title = shortcut ? `${label} (${shortcut})` : label;
  return (
    <button
      type="button"
      title={title}
      aria-label={label}
      aria-pressed={pressed}
      aria-busy={busy || undefined}
      disabled={busy}
      // Keep the cursor and selection in the text box while a button is pressed.
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={cn(
        "grid size-8 cursor-pointer place-items-center rounded-md text-ink transition-colors hover:bg-ink/5 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none disabled:cursor-wait disabled:text-subtle",
        pressed && "bg-primary-soft text-forest",
      )}
    >
      {children}
    </button>
  );
}

const Divider = () => <span aria-hidden className="mx-1 h-5 w-px bg-line" />;

/**
 * A text box for Markdown with a toolbar (bold, italic, headings, lists, links,
 * pictures, tables) and an optional live preview. The text stays plain Markdown,
 * exactly what the website already reads, so nothing written before is changed.
 */
export function MarkdownEditor({
  id,
  name,
  value,
  onChange,
  rows = 12,
  maxLength,
  headings = 2,
  images = false,
  linkTargets,
  preview = "text",
  defaultPreview = false,
  invalid,
  describedBy,
}: Props) {
  const area = useRef<HTMLTextAreaElement>(null);
  const remembered = useRef<Selection>({ start: 0, end: 0 });
  const [panel, setPanel] = useState<Panel>(null);
  const [showPreview, setShowPreview] = useState(defaultPreview);
  const [linkText, setLinkText] = useState("");
  const [linkAddress, setLinkAddress] = useState("");
  const [linkError, setLinkError] = useState("");
  const [columns, setColumns] = useState(3);
  const [tableRows, setTableRows] = useState(2);
  const [pending, setPending] = useState<[number, number] | null>(null);
  const panelId = useId();

  // Used only when the browser cannot apply an edit as a typing step.
  useLayoutEffect(() => {
    if (!pending || !area.current) return;
    area.current.setSelectionRange(pending[0], pending[1]);
    setPending(null);
  }, [pending]);

  const current = (): Selection => {
    const el = area.current;
    return el
      ? { start: el.selectionStart, end: el.selectionEnd }
      : { start: value.length, end: value.length };
  };

  /** Applies an edit as one typing step, so Undo (Ctrl/Cmd+Z) takes it back. */
  const apply = (edit: Edit) => {
    const el = area.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(edit.from, edit.to);
    const typed =
      typeof document.execCommand === "function" &&
      document.execCommand("insertText", false, edit.insert);
    if (typed) {
      el.setSelectionRange(edit.select[0], edit.select[1]);
    } else {
      onChange(value.slice(0, edit.from) + edit.insert + value.slice(edit.to));
      setPending(edit.select);
    }
  };

  const upload = useImageUpload((url) =>
    apply(
      insertBlock(
        value,
        remembered.current,
        `![Describe this image](${url})`,
        "Describe this image",
      ),
    ),
  );

  const bold = () => apply(toggleInline(value, current(), "bold", "bold text"));
  const italic = () =>
    apply(toggleInline(value, current(), "italic", "italic text"));

  const openLink = () => {
    const selection = current();
    remembered.current = selection;
    const selected = value.slice(selection.start, selection.end).trim();
    const isAddress = /^(https?:\/\/|\/|mailto:|tel:)\S+$/i.test(selected);
    setLinkText(isAddress ? "" : selected);
    setLinkAddress(isAddress ? selected : "");
    setLinkError("");
    setPanel("link");
  };

  const addLink = () => {
    const checked = checkAddress(linkAddress);
    if ("error" in checked) {
      setLinkError(checked.error);
      return;
    }
    const text = linkText.trim() || checked.address;
    apply(insertLink(value, remembered.current, text, checked.address));
    setPanel(null);
  };

  const openTable = () => {
    remembered.current = current();
    setPanel("table");
  };

  const addTable = () => {
    apply(
      insertBlock(
        value,
        remembered.current,
        tableSnippet(columns, tableRows),
        "Column 1",
      ),
    );
    setPanel(null);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey)
      return;
    const key = event.key.toLowerCase();
    if (key === "b") bold();
    else if (key === "i") italic();
    else if (key === "k") openLink();
    else return;
    event.preventDefault();
  };

  // Focus the first box of an opened panel.
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (panel) panelRef.current?.querySelector("input")?.focus();
  }, [panel]);

  const submitOnEnter = (action: () => void) => (event: KeyboardEvent) => {
    if (event.key === "Enter") {
      // The editor sits inside a form: Enter must not save the whole article.
      event.preventDefault();
      action();
    } else if (event.key === "Escape") {
      event.stopPropagation();
      setPanel(null);
      area.current?.focus();
    }
  };

  const textProps: ComponentProps<"textarea"> = {
    id,
    name,
    value,
    rows,
    maxLength,
    onChange: (event) => onChange(event.target.value),
    onKeyDown,
    "aria-invalid": invalid || undefined,
    "aria-describedby": describedBy,
  };

  return (
    <div className="@container">
      <div
        role="toolbar"
        aria-label="Text formatting"
        className="flex flex-wrap items-center gap-0.5 rounded-t-lg border border-b-0 border-line bg-surface px-1.5 py-1"
      >
        <ToolButton label="Bold" shortcut="Ctrl+B" onClick={bold}>
          <Bold aria-hidden className="size-4" />
        </ToolButton>
        <ToolButton label="Italic" shortcut="Ctrl+I" onClick={italic}>
          <Italic aria-hidden className="size-4" />
        </ToolButton>
        <Divider />
        <ToolButton
          label={headings === 2 ? "Heading (H2)" : "Heading"}
          onClick={() => apply(toggleHeading(value, current(), 2, "Heading"))}
        >
          <Heading2 aria-hidden className="size-4" />
        </ToolButton>
        {headings === 2 ? (
          <ToolButton
            label="Sub-heading (H3)"
            onClick={() =>
              apply(toggleHeading(value, current(), 3, "Sub-heading"))
            }
          >
            <Heading3 aria-hidden className="size-4" />
          </ToolButton>
        ) : null}
        <Divider />
        <ToolButton
          label="Bulleted list"
          onClick={() => apply(toggleList(value, current(), "bullet", "Item"))}
        >
          <List aria-hidden className="size-4" />
        </ToolButton>
        <ToolButton
          label="Numbered list"
          onClick={() =>
            apply(toggleList(value, current(), "numbered", "Item"))
          }
        >
          <ListOrdered aria-hidden className="size-4" />
        </ToolButton>
        <Divider />
        <ToolButton
          label="Link"
          shortcut="Ctrl+K"
          pressed={panel === "link"}
          onClick={() => (panel === "link" ? setPanel(null) : openLink())}
        >
          <Link2 aria-hidden className="size-4" />
        </ToolButton>
        {images ? (
          <>
            <input
              id={`${id}-image`}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              tabIndex={-1}
              aria-hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) upload.mutate(file);
                event.target.value = "";
              }}
            />
            <ToolButton
              label="Insert image"
              busy={upload.isPending}
              onClick={() => {
                remembered.current = current();
                document.getElementById(`${id}-image`)?.click();
              }}
            >
              {upload.isPending ? (
                <Loader2 aria-hidden className="size-4 animate-spin" />
              ) : (
                <ImagePlus aria-hidden className="size-4" />
              )}
            </ToolButton>
          </>
        ) : null}
        <ToolButton
          label="Table"
          pressed={panel === "table"}
          onClick={() => (panel === "table" ? setPanel(null) : openTable())}
        >
          <Table2 aria-hidden className="size-4" />
        </ToolButton>
        {linkTargets?.length ? (
          <>
            <Divider />
            <label className="sr-only" htmlFor={`${id}-page`}>
              Link to a page of this site
            </label>
            <Select
              id={`${id}-page`}
              value=""
              className="h-8 w-44 text-[13px]"
              onChange={(event) => {
                const target = linkTargets.find(
                  (item) => item.path === event.target.value,
                );
                if (!target) return;
                const selection = current();
                const picked = value
                  .slice(selection.start, selection.end)
                  .trim();
                apply(
                  insertLink(
                    value,
                    selection,
                    picked || target.title,
                    target.path,
                  ),
                );
              }}
            >
              <option value="">Link to a page…</option>
              {linkTargets.map((target) => (
                <option key={target.path} value={target.path}>
                  {target.title}
                </option>
              ))}
            </Select>
          </>
        ) : null}
        <button
          type="button"
          aria-pressed={showPreview}
          onClick={() => setShowPreview((on) => !on)}
          className={cn(
            "ml-auto inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md px-2.5 text-[13px] font-semibold text-ink transition-colors hover:bg-ink/5 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none",
            showPreview && "bg-primary-soft text-forest",
          )}
        >
          <Eye aria-hidden className="size-4" />
          Preview
        </button>
      </div>

      {panel === "link" ? (
        <div
          ref={panelRef}
          id={panelId}
          className="grid gap-3 border border-b-0 border-line bg-mint-soft/40 p-3 @xl:grid-cols-[1fr_1.4fr_auto] @xl:items-end"
        >
          <div>
            <label
              htmlFor={`${panelId}-text`}
              className="mb-1 block text-xs font-semibold"
            >
              Text to show
            </label>
            <Input
              id={`${panelId}-text`}
              value={linkText}
              onChange={(event) => setLinkText(event.target.value)}
              onKeyDown={submitOnEnter(addLink)}
              className="h-9"
            />
          </div>
          <div>
            <label
              htmlFor={`${panelId}-address`}
              className="mb-1 block text-xs font-semibold"
            >
              Address
            </label>
            <Input
              id={`${panelId}-address`}
              value={linkAddress}
              placeholder="https://… or /uk/page/"
              aria-invalid={linkError ? true : undefined}
              aria-describedby={linkError ? `${panelId}-error` : undefined}
              onChange={(event) => {
                setLinkAddress(event.target.value);
                setLinkError("");
              }}
              onKeyDown={submitOnEnter(addLink)}
              className="h-9"
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={addLink}>
              Add link
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setPanel(null)}>
              Cancel
            </Button>
          </div>
          {linkError ? (
            <p
              id={`${panelId}-error`}
              role="alert"
              className="text-xs text-red-600 @xl:col-span-3"
            >
              {linkError}
            </p>
          ) : null}
        </div>
      ) : null}

      {panel === "table" ? (
        <div
          ref={panelRef}
          className="flex flex-wrap items-end gap-3 border border-b-0 border-line bg-mint-soft/40 p-3"
        >
          <div>
            <label
              htmlFor={`${panelId}-columns`}
              className="mb-1 block text-xs font-semibold"
            >
              Columns
            </label>
            <Input
              id={`${panelId}-columns`}
              type="number"
              min={2}
              max={6}
              value={columns}
              onChange={(event) =>
                setColumns(
                  Math.min(6, Math.max(2, Number(event.target.value) || 2)),
                )
              }
              onKeyDown={submitOnEnter(addTable)}
              className="h-9 w-20"
            />
          </div>
          <div>
            <label
              htmlFor={`${panelId}-rows`}
              className="mb-1 block text-xs font-semibold"
            >
              Rows
            </label>
            <Input
              id={`${panelId}-rows`}
              type="number"
              min={1}
              max={12}
              value={tableRows}
              onChange={(event) =>
                setTableRows(
                  Math.min(12, Math.max(1, Number(event.target.value) || 1)),
                )
              }
              onKeyDown={submitOnEnter(addTable)}
              className="h-9 w-20"
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={addTable}>
              Insert table
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setPanel(null)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      <div className={cn(showPreview && "grid gap-3 @xl:grid-cols-2")}>
        <Textarea
          {...textProps}
          ref={area}
          className={cn(
            "rounded-t-none font-mono text-[13px]",
            showPreview && "@xl:max-h-[32rem]",
          )}
        />
        {showPreview ? (
          <section
            aria-label="Preview of the text"
            className="max-h-[32rem] overflow-y-auto rounded-lg border border-line bg-white p-4"
          >
            <p className="mb-2 text-[11px] font-semibold tracking-[0.1em] text-subtle uppercase">
              Preview
            </p>
            <Suspense
              fallback={<p className="text-sm text-subtle">Loading preview…</p>}
            >
              <MarkdownPreview markdown={value} kind={preview} />
            </Suspense>
          </section>
        ) : null}
      </div>
    </div>
  );
}
