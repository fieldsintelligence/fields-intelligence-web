/**
 * Blog markdown → typed blocks. Pure: no fs, no React. Rendering lives in
 * components/BlogArticle.tsx; image checks live in lib/blog-images.ts.
 * See docs/architecture/blog-renderer.md.
 *
 * Supported syntax, one block per blank-line-separated group:
 *   ## Heading              → Heading2
 *   - item                  → BulletList
 *   1. item                 → OrderedList
 *   ![alt](/blog/x.png)     → Figure; a *…* line directly under it is its caption
 *   anything else           → Paragraph (inline **bold**, *em*, [text](https://…), bare https://…)
 * HTML comments are stripped. Any other tag-like text stays literal text.
 */

export type InlineNode =
  | { type: "text"; value: string }
  | { type: "strong"; value: string }
  | { type: "em"; value: string }
  | { type: "link"; href: string; value: string };

export type Paragraph = { kind: "paragraph"; text: InlineNode[] };
export type Heading2 = { kind: "heading2"; text: string };
export type BulletList = { kind: "bulletList"; items: InlineNode[][] };
export type OrderedList = { kind: "orderedList"; items: InlineNode[][] };
export type Figure = {
  kind: "figure";
  src: string;
  alt: string;
  width: number;
  height: number;
  caption?: string;
};

export type Block = Paragraph | Heading2 | BulletList | OrderedList | Figure;

/** Validates an image src and returns its pixel size; throws on anything not allowed. */
export type ImageResolver = (src: string) => { width: number; height: number };

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function formatBlogDate(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return isoDate;
  const month = MONTHS[Number(match[2]) - 1];
  if (!month) return isoDate;
  return `${month} ${Number(match[3])}, ${match[1]}`;
}

function unquote(value: string): string {
  if (
    value.length >= 2 &&
    ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'")))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

export function parseFrontmatter(raw: string): { data: Record<string, string>; body: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) {
    throw new Error("Blog post is missing frontmatter.");
  }
  const data: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    if (!line.trim()) continue;
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    data[key] = unquote(line.slice(idx + 1).trim());
  }
  return { data, body: match[2].trim() };
}

/**
 * Links render only for https:// URLs and same-site paths. Anything else stays text.
 * A same-site path may not start with "//" or "/\\" and holds no backslash (PR #40).
 */
function safeHref(href: string): boolean {
  return /^https:\/\/[^\s]+$/.test(href) || /^\/(?![\/\\])[^\s\\]*$/.test(href);
}

export function parseInlines(input: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  const pattern = /\*\*([^*]+)\*\*|\*([^*]+)\*|\[([^\]]+)\]\(([^)]+)\)|https:\/\/[^\s)]+/g;
  let last = 0;
  const pushText = (value: string) => {
    const prev = nodes[nodes.length - 1];
    if (prev && prev.type === "text") prev.value += value;
    else nodes.push({ type: "text", value });
  };
  for (const match of input.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > last) pushText(input.slice(last, index));
    if (match[1] !== undefined) {
      nodes.push({ type: "strong", value: match[1] });
    } else if (match[2] !== undefined) {
      nodes.push({ type: "em", value: match[2] });
    } else if (match[3] !== undefined && match[4] !== undefined) {
      if (safeHref(match[4])) nodes.push({ type: "link", value: match[3], href: match[4] });
      else pushText(match[3]);
    } else {
      nodes.push({ type: "link", href: match[0], value: match[0] });
    }
    last = index + match[0].length;
  }
  if (last < input.length) pushText(input.slice(last));
  return nodes;
}

const IMAGE_LINE = /^!\[([^\]]*)\]\(([^)\s]+)\)$/;
const CAPTION_LINE = /^\*([^*](?:.*[^*])?)\*$/;
const BULLET = /^- /;
const ORDERED = /^\d+\. /;

function stripHtmlComments(body: string): string {
  return body.replace(/<!--[\s\S]*?-->/g, "");
}

function startsBlock(line: string): boolean {
  const t = line.trim();
  return t.startsWith("#") || t.startsWith("![") || BULLET.test(line) || ORDERED.test(line);
}

export function parseBlocks(body: string, resolveImage: ImageResolver): Block[] {
  const lines = stripHtmlComments(body).split(/\r?\n/);
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed === "") {
      i += 1;
      continue;
    }

    if (trimmed.startsWith("#")) {
      const heading = /^## (.+)$/.exec(trimmed);
      if (!heading) throw new Error(`Unsupported blog heading (only ## is allowed): ${trimmed}`);
      blocks.push({ kind: "heading2", text: heading[1].trim() });
      i += 1;
      continue;
    }

    if (/^\[Fig\./.test(trimmed)) {
      throw new Error(`Unsupported blog figure marker (use an image line): ${trimmed}`);
    }

    if (trimmed.startsWith("![")) {
      const image = IMAGE_LINE.exec(trimmed);
      if (!image) throw new Error(`Malformed blog image line: ${trimmed}`);
      const [, alt, src] = image;
      const { width, height } = resolveImage(src);
      const figure: Figure = { kind: "figure", src, alt, width, height };
      const caption = CAPTION_LINE.exec((lines[i + 1] ?? "").trim());
      if (caption) {
        figure.caption = caption[1];
        i += 2;
      } else {
        i += 1;
      }
      blocks.push(figure);
      continue;
    }

    if (BULLET.test(line) || ORDERED.test(line)) {
      const re = BULLET.test(line) ? BULLET : ORDERED;
      const items: InlineNode[][] = [];
      while (i < lines.length && re.test(lines[i])) {
        items.push(parseInlines(lines[i].replace(re, "")));
        i += 1;
      }
      blocks.push(re === BULLET ? { kind: "bulletList", items } : { kind: "orderedList", items });
      continue;
    }

    const paragraph: string[] = [];
    while (i < lines.length && lines[i].trim() !== "" && (paragraph.length === 0 || !startsBlock(lines[i]))) {
      paragraph.push(lines[i]);
      i += 1;
    }
    blocks.push({ kind: "paragraph", text: parseInlines(paragraph.join(" ")) });
  }

  return blocks;
}
