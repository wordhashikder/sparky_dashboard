import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { imageSrc } from "./image-picker";

/*
 * A close copy of how the website shows Markdown, so the team sees the result
 * while writing. It is loaded only when the preview is opened. Raw HTML is
 * never rendered, unsafe link protocols are dropped by the library, and links
 * do not navigate, so nothing in the text can run or take the editor away.
 */

export type PreviewKind = "article" | "page" | "text";

const heading = (className: string): Components["h2"] =>
  function Heading({ node: _node, ...props }) {
    return <h3 className={className} {...props} />;
  };

function components(kind: PreviewKind): Components {
  const major =
    kind === "article"
      ? "mt-8 mb-3 text-xl font-extrabold leading-tight text-ink"
      : kind === "page"
        ? "mt-6 mb-2 text-lg font-bold text-ink"
        : "mt-1 mb-2 text-base font-bold text-ink";
  const minor =
    kind === "article"
      ? "mt-6 mb-2 text-base font-bold text-ink"
      : kind === "page"
        ? "mt-5 mb-2 text-base font-bold text-ink"
        : major;
  return {
    h1: heading(major),
    h2: heading(major),
    h3: heading(minor),
    h4: heading(minor),
    p: ({ node: _node, ...props }) => <p className="my-3" {...props} />,
    ul: ({ node: _node, ...props }) => (
      <ul
        className="my-3 list-disc space-y-1.5 pl-5 marker:text-primary"
        {...props}
      />
    ),
    ol: ({ node: _node, ...props }) => (
      <ol
        className="my-3 list-decimal space-y-1.5 pl-5 marker:font-semibold marker:text-primary"
        {...props}
      />
    ),
    strong: ({ node: _node, ...props }) => (
      <strong className="font-semibold text-ink" {...props} />
    ),
    a: ({ node: _node, href, children }) => (
      // Not a link in the editor: clicking it must not leave the form.
      <a
        href={href}
        onClick={(event) => event.preventDefault()}
        className="font-medium text-primary-dark underline decoration-primary/40 underline-offset-4"
      >
        {children}
      </a>
    ),
    blockquote: ({ node: _node, ...props }) => (
      <blockquote
        className="my-4 rounded-r-lg border-l-4 border-primary bg-mint-soft px-4 py-2 [&>p]:my-1"
        {...props}
      />
    ),
    hr: () => <hr className="my-6 border-line" />,
    table: ({ node: _node, ...props }) => (
      <div className="my-4 overflow-x-auto rounded-lg border border-line">
        <table
          className="w-full min-w-[320px] border-collapse text-left text-[13px]"
          {...props}
        />
      </div>
    ),
    thead: ({ node: _node, ...props }) => (
      <thead className="bg-mint-soft" {...props} />
    ),
    th: ({ node: _node, ...props }) => (
      <th
        className="border-b border-line px-3 py-2 font-semibold text-ink"
        {...props}
      />
    ),
    td: ({ node: _node, ...props }) => (
      <td className="border-b border-line px-3 py-2 align-top" {...props} />
    ),
    code: ({ node: _node, ...props }) => (
      <code
        className="rounded bg-surface px-1.5 py-0.5 text-[0.9em] text-ink"
        {...props}
      />
    ),
    pre: ({ node: _node, ...props }) => (
      <pre
        className="my-4 overflow-x-auto rounded-lg bg-surface p-3 text-[13px] [&>code]:bg-transparent [&>code]:p-0"
        {...props}
      />
    ),
    img: ({ node: _node, src, alt }) =>
      typeof src === "string" ? (
        <img
          src={imageSrc(src)}
          alt={alt ?? ""}
          loading="lazy"
          className="my-4 h-auto w-full rounded-lg"
        />
      ) : null,
  };
}

export default function MarkdownPreview({
  markdown,
  kind,
  className,
}: {
  markdown: string;
  kind: PreviewKind;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "text-sm leading-relaxed text-ink/80 [&>*:first-child]:mt-0",
        className,
      )}
    >
      {markdown.trim() ? (
        <Markdown
          remarkPlugins={[remarkGfm]}
          components={components(kind)}
          skipHtml
        >
          {markdown}
        </Markdown>
      ) : (
        <p className="text-subtle">Nothing to preview yet.</p>
      )}
    </div>
  );
}
