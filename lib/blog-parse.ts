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
  caption?: CaptionInline[];
};

/**
 * Figure caption inline nodes (PR #43). Flat: the text of Strong, Em and Link is
 * plain text, never nested markup. See docs/architecture/blog-renderer.md.
 */
export type CaptionText = { kind: "text"; text: string };
export type CaptionStrong = { kind: "strong"; text: string };
export type CaptionEm = { kind: "em"; text: string };
export type CaptionLink = { kind: "link"; href: string; text: string };
export type CaptionInline = CaptionText | CaptionStrong | CaptionEm | CaptionLink;

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
 * Exact hostnames a body link (markdown or bare) may point to (PR #43, Blue Hat
 * L-1). A repo constant: adding a host is a spec change. No suffix or substring
 * matching. example.com is IANA-reserved (RFC 2606) and used by the renderer tests.
 */
export const BODY_LINK_HOSTS: readonly string[] = [
  "fieldsintelligence.com",
  "developers.openai.com",
  "x.com",
  "projectdiscovery.io",
  "example.com",
];

/**
 * Checks an external body link: parses with new URL(), https only, no username
 * or password, no port, hostname exactly in BODY_LINK_HOSTS. Returns the
 * serialized URL, or null so the caller renders the text without a link.
 */
export function checkBodyHref(raw: string): string | null {
  // The URL parser silently strips tabs and newlines, so check the raw text first.
  if (/[\s\u0000-\u001f\u007f]/.test(raw)) return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  if (url.username !== "" || url.password !== "") return null;
  if (url.port !== "") return null;
  if (!BODY_LINK_HOSTS.includes(url.hostname)) return null;
  return url.href;
}

/**
 * Returns the href to render, or null: an external link must pass checkBodyHref;
 * a same-site path may not start with "//" or "/\\" and holds no backslash (PR #40).
 */
function safeHref(href: string): string | null {
  if (/^\/(?![\/\\])[^\s\\]*$/.test(href)) return href;
  return checkBodyHref(href);
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
      const href = safeHref(match[4]);
      if (href !== null) nodes.push({ type: "link", value: match[3], href });
      else pushText(match[3]);
    } else {
      // Bare link: same exact-host check as a markdown link (PR #43, Blue Hat L-1).
      const href = checkBodyHref(match[0]);
      if (href !== null) nodes.push({ type: "link", href, value: match[0] });
      else pushText(match[0]);
    }
    last = index + match[0].length;
  }
  if (last < input.length) pushText(input.slice(last));
  return nodes;
}

/**
 * Exact hostnames a caption link may point to. A repo constant: adding a host
 * is a spec change (PR #43, spec point B). No suffix or substring matching.
 */
export const CAPTION_LINK_HOSTS: readonly string[] = [
  "openai.com",
  "platform.openai.com",
  // The ZDR post's source link (pre-#40 caption); spec change in PR #43.
  "developers.openai.com",
];

/** Checks a caption link href and returns the serialized URL. Throws `${where}: …` on any violation. */
export function validateCaptionHref(raw: string, where: string): string {
  const fail = (reason: string): never => {
    throw new Error(`${where}: caption link ${reason}: ${JSON.stringify(raw)}`);
  };
  // The URL parser silently strips tabs and newlines, so check the raw text first.
  if (/[\s\u0000-\u001f\u007f]/.test(raw)) fail("contains whitespace or control characters");
  let url: URL | null = null;
  try {
    url = new URL(raw);
  } catch {
    fail("is not an absolute URL");
  }
  if (!url) return fail("is not an absolute URL");
  if (url.protocol !== "https:") fail("must use https");
  if (url.username !== "" || url.password !== "") fail("must not carry a username or password");
  if (url.port !== "") fail("must not set a port");
  if (!CAPTION_LINK_HOSTS.includes(url.hostname)) fail(`host ${url.hostname} is not in CAPTION_LINK_HOSTS`);
  return url.href;
}

/**
 * Parses the inside of a caption line: **bold**, *italic*, [text](https://…).
 * Unmatched markers stay literal text and never throw. A well-formed link with
 * a disallowed href throws (the build fails).
 */
export function parseCaptionInlines(input: string, where = "caption"): CaptionInline[] {
  const nodes: CaptionInline[] = [];
  let literal = "";
  const flush = () => {
    if (literal) nodes.push({ kind: "text", text: literal });
    literal = "";
  };
  let i = 0;
  while (i < input.length) {
    if (input.startsWith("**", i)) {
      const end = input.indexOf("**", i + 2);
      if (end > i + 2) {
        flush();
        nodes.push({ kind: "strong", text: input.slice(i + 2, end) });
        i = end + 2;
      } else {
        literal += "**";
        i += 2;
      }
      continue;
    }
    if (input[i] === "*") {
      const end = input.indexOf("*", i + 1);
      if (end > i + 1) {
        flush();
        nodes.push({ kind: "em", text: input.slice(i + 1, end) });
        i = end + 1;
      } else {
        literal += "*";
        i += 1;
      }
      continue;
    }
    if (input[i] === "[") {
      const mid = input.indexOf("](", i + 1);
      const end = mid === -1 ? -1 : input.indexOf(")", mid + 2);
      if (mid > i + 1 && end > mid + 2) {
        flush();
        const text = input.slice(i + 1, mid);
        const href = validateCaptionHref(input.slice(mid + 2, end), where);
        nodes.push({ kind: "link", href, text });
        i = end + 1;
      } else {
        literal += "[";
        i += 1;
      }
      continue;
    }
    literal += input[i];
    i += 1;
  }
  flush();
  return nodes;
}

const IMAGE_LINE = /^!\[([^\]]*)\]\(([^)\s]+)\)$/;
/** The caption line: outer asterisks are the delimiter; the inside may start or end with **bold**. */
const CAPTION_LINE = /^\*(.+)\*$/;
const BULLET = /^- /;
const ORDERED = /^\d+\. /;

/** Strips HTML comments but keeps their newlines, so line numbers stay true. */
function stripHtmlComments(body: string): string {
  return body.replace(/<!--[\s\S]*?-->/g, (comment) => comment.replace(/[^\n]/g, ""));
}

function startsBlock(line: string): boolean {
  const t = line.trim();
  return t.startsWith("#") || t.startsWith("![") || BULLET.test(line) || ORDERED.test(line);
}

/** Where the body came from, for build errors: the file and the 1-based line of the body's first line. */
export type BodySource = { file: string; line: number };

export function parseBlocks(body: string, resolveImage: ImageResolver, source?: BodySource): Block[] {
  const where = (index: number) => (source ? `${source.file}:${source.line + index}` : `line ${index + 1}`);
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
        figure.caption = parseCaptionInlines(caption[1], where(i + 1));
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
