/*
 * The text changes behind the Markdown editor's toolbar.
 *
 * Every function is pure: it reads the text and the selection and returns an
 * `Edit` (replace `from..to` with `insert`, then select `select`). The editor
 * applies it as one typing step, so Undo works, and text the team did not touch
 * is never rewritten.
 */

export type Selection = { start: number; end: number };

export type Edit = {
  from: number;
  to: number;
  insert: string;
  /** Selection after the edit, in the new text. */
  select: [number, number];
};

const HEADING = /^\s{0,3}#{1,6}\s+/;
const BULLET = /^\s*[-*+]\s+/;
const NUMBERED = /^\s*\d+[.)]\s+/;

function trailingNewlines(text: string) {
  return text.length - text.replace(/\n+$/, "").length;
}

function leadingNewlines(text: string) {
  return text.length - text.replace(/^\n+/, "").length;
}

/** Bold (`**`) or italic (`*`): adds the marks, or removes them when already there. */
export function toggleInline(
  value: string,
  { start, end }: Selection,
  kind: "bold" | "italic",
  placeholder: string,
): Edit {
  const mark = kind === "bold" ? "**" : "*";
  const selected = value.slice(start, end);
  const lead = selected.length - selected.trimStart().length;
  const trail = selected.length - selected.trimEnd().length;
  const from = start + (selected.trim() ? lead : 0);
  const to = end - (selected.trim() ? trail : 0);
  const text = value.slice(from, to);

  if (text) {
    const before = value.slice(0, from).match(/\*+$/)?.[0].length ?? 0;
    const after = value.slice(to).match(/^\*+/)?.[0].length ?? 0;
    const run = Math.min(before, after);
    const marked = kind === "bold" ? run >= 2 : run % 2 === 1;
    if (marked) {
      return {
        from: from - mark.length,
        to: to + mark.length,
        insert: text,
        select: [from - mark.length, from - mark.length + text.length],
      };
    }
    return {
      from,
      to,
      insert: `${mark}${text}${mark}`,
      select: [from + mark.length, from + mark.length + text.length],
    };
  }
  return {
    from: start,
    to: end,
    insert: `${mark}${placeholder}${mark}`,
    select: [start + mark.length, start + mark.length + placeholder.length],
  };
}

/** The whole lines a selection touches. */
function lineRange(value: string, { start, end }: Selection) {
  const from = value.lastIndexOf("\n", start - 1) + 1;
  const last = end > start && value[end - 1] === "\n" ? end - 1 : end;
  const stop = value.indexOf("\n", last);
  return { from, to: stop === -1 ? value.length : stop };
}

function replaceLines(
  value: string,
  selection: Selection,
  change: (lines: string[]) => string[],
  keepSelection: boolean,
  lead = "",
): Edit {
  const { from, to } = lineRange(value, selection);
  const lines = change(value.slice(from, to).split("\n"));
  const insert = `${lead}${lines.join("\n")}`;
  const caret = from + insert.length;
  return {
    from,
    to,
    insert,
    select:
      keepSelection && lines.length > 1
        ? [from + lead.length, caret]
        : [caret, caret],
  };
}

const stripBlock = (line: string) =>
  line.replace(HEADING, "").replace(BULLET, "").replace(NUMBERED, "");

/** `##` / `###` on the touched lines; pressing it again removes the heading. */
export function toggleHeading(
  value: string,
  selection: Selection,
  level: 2 | 3,
  placeholder: string,
): Edit {
  const { from, to } = lineRange(value, selection);
  const lines = value.slice(from, to).split("\n");
  const filled = lines.filter((line) => line.trim());
  const marks = "#".repeat(level);
  if (!filled.length) {
    return {
      from,
      to,
      insert: `${marks} ${placeholder}`,
      select: [
        from + marks.length + 1,
        from + marks.length + 1 + placeholder.length,
      ],
    };
  }
  const already = filled.every((line) => {
    const match = line.match(/^\s{0,3}(#{1,6})\s+/);
    return match?.[1].length === level;
  });
  return replaceLines(
    value,
    selection,
    (all) =>
      all.map((line) => {
        if (!line.trim()) return line;
        const text = stripBlock(line);
        return already ? text : `${marks} ${text}`;
      }),
    true,
  );
}

/** A bulleted or numbered list on the touched lines; pressing it again removes it. */
export function toggleList(
  value: string,
  selection: Selection,
  kind: "bullet" | "numbered",
  placeholder: string,
): Edit {
  const { from, to } = lineRange(value, selection);
  const lines = value.slice(from, to).split("\n");
  const filled = lines.filter((line) => line.trim());
  const marker = kind === "bullet" ? BULLET : NUMBERED;
  if (!filled.length) {
    const mark = kind === "bullet" ? "- " : "1. ";
    return {
      from,
      to,
      insert: `${mark}${placeholder}`,
      select: [from + mark.length, from + mark.length + placeholder.length],
    };
  }
  const already = filled.every((line) => marker.test(line));
  // A list straight under a paragraph is easier to read with a blank line between.
  const before = value.slice(0, from).replace(/\n$/, "");
  const previous = before.slice(before.lastIndexOf("\n") + 1);
  const needsGap =
    !already &&
    from > 0 &&
    value[from - 1] === "\n" &&
    previous.trim() !== "" &&
    !BULLET.test(previous) &&
    !NUMBERED.test(previous);
  let number = 0;
  return replaceLines(
    value,
    selection,
    (all) =>
      all.map((line) => {
        if (!line.trim()) return line;
        const text = stripBlock(line);
        if (already) return text;
        number += 1;
        return kind === "bullet" ? `- ${text}` : `${number}. ${text}`;
      }),
    true,
    needsGap ? "\n" : "",
  );
}

/** Puts `snippet` on its own, with a blank line around it so nothing swallows it. */
export function insertBlock(
  value: string,
  { start, end }: Selection,
  snippet: string,
  highlight: string,
): Edit {
  const before = value.slice(0, start);
  const after = value.slice(end);
  const lead = before.trim()
    ? "\n".repeat(Math.max(0, 2 - trailingNewlines(before)))
    : "";
  const trail = after.trim()
    ? "\n".repeat(Math.max(0, 2 - leadingNewlines(after)))
    : "\n\n";
  const at = start + lead.length + snippet.indexOf(highlight);
  return {
    from: start,
    to: end,
    insert: `${lead}${snippet}${trail}`,
    select: [at, at + highlight.length],
  };
}

/** `[text](address)` in place of the selection. */
export function insertLink(
  value: string,
  { start, end }: Selection,
  text: string,
  address: string,
): Edit {
  void value;
  const safe = address
    .replace(/ /g, "%20")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29");
  const insert = `[${text}](${safe})`;
  return {
    from: start,
    to: end,
    insert,
    select: [start + insert.length, start + insert.length],
  };
}

export function tableSnippet(columns: number, rows: number) {
  const row = (cell: (index: number) => string) =>
    `| ${Array.from({ length: columns }, (_, index) => cell(index)).join(" | ")} |`;
  return [
    row((index) => `Column ${index + 1}`),
    row(() => "---"),
    ...Array.from({ length: rows }, () => row(() => "Text")),
  ].join("\n");
}

export type LinkCheck = { address: string } | { error: string };

/** Tidies an address typed into the link box, or says what is wrong with it. */
export function checkAddress(input: string): LinkCheck {
  const address = input.trim();
  if (!address) return { error: "Enter the address the link should open." };
  if (/\s/.test(address) && !/^(\/|https?:\/\/)/i.test(address))
    return { error: "An address cannot contain spaces." };
  if (/^(\/(?!\/)|#|mailto:|tel:|https?:\/\/)/i.test(address))
    return { address };
  if (/^[a-z][a-z0-9+.-]*:/i.test(address))
    return { error: "Use an address starting with https://, / or mailto:." };
  if (/^[^\s/]+\.[^\s/]{2,}/.test(address))
    return { address: `https://${address}` };
  return { error: "Use an address such as https://example.com or /uk/page/." };
}
