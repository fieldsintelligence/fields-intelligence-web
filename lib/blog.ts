import fs from "node:fs";
import path from "node:path";
import { site } from "@/lib/site";

const BLOG_DIR = path.join(process.cwd(), "content/blog");

/** First post. Homepage punch and the canonical URL stay pointed here. */
export const CANONICAL_POST_SLUG =
  "zero-retention-isnt-zero-if-someone-still-reads-your-prompts-for-safety";

export const blogIndexUrl = site.blogUrl;

export function postCanonicalUrl(slug: string): string {
  return `${site.blogUrl}/${slug}`;
}

export type InlineNode =
  | { type: "text"; value: string }
  | { type: "strong"; value: string }
  | { type: "em"; value: string }
  | { type: "link"; href: string; value: string };

export type Figure = {
  id: "fig-1" | "fig-2" | "fig-3";
  src: string;
  width: number;
  height: number;
  alt: string;
  title: string;
  caption: InlineNode[];
};

export type Block =
  | { type: "paragraph"; inlines: InlineNode[] }
  | { type: "list"; items: InlineNode[][] }
  | ({ type: "figure" } & Figure);

export type Post = {
  slug: string;
  title: string;
  date: string;
  description: string;
  canonicalUrl: string;
  blocks: Block[];
};

const FIGURES: Record<
  string,
  Omit<Figure, "caption"> & { caption: string }
> = {
  "[Fig. 1 — API retention annotated]": {
    id: "fig-1",
    src: "/blog/blog-openai-api-retention-NotZDR.png",
    width: 1600,
    height: 738,
    alt: "Annotated OpenAI API Request and Retention diagram, stamped ZDR!?",
    title: "Fig. 1 — API request and retention (annotated)",
    caption:
      "Annotated from OpenAI’s published “API Request and Retention” diagram in *ZDR with Private Safety Processing*. Original diagram © OpenAI; red ellipse and “ZDR!?” annotations by Fields Intelligence for commentary. Source: https://developers.openai.com/api/docs/guides/private-safety-processing",
  },
  "[Fig. 2 — Async safety annotated]": {
    id: "fig-2",
    src: "/blog/blog-openai-async-safety-NotZDR.png",
    width: 1600,
    height: 714,
    alt: "Annotated OpenAI Asynchronous Safety Pipeline diagram, stamped ZDR!?",
    title: "Fig. 2 — Asynchronous safety pipeline (annotated)",
    caption:
      "Annotated from OpenAI’s published “Asynchronous Safety Pipeline” diagram in *ZDR with Private Safety Processing*. Original diagram © OpenAI; green OK / red X and “ZDR!?” annotations by Fields Intelligence for commentary. Source: https://developers.openai.com/api/docs/guides/private-safety-processing",
  },
  "[Fig. 3 — FI true ZDR path]": {
    id: "fig-3",
    src: "/blog/blog-fields-intelligence-true-zdr-path.png",
    width: 1600,
    height: 460,
    alt: "Fields Intelligence true ZDR path: API request, ZDR inference, API response",
    title: "Fig. 3 — Fields Intelligence true ZDR path",
    caption:
      "Fields Intelligence illustration. API request → ZDR inference (no retention, no AI interaction logs) → API response. That’s the whole graph.",
  },
};

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

function parseFrontmatter(raw: string): { data: Record<string, string>; body: string } {
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

function parseInlines(input: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  const pattern = /\*\*([^*]+)\*\*|\*([^*]+)\*|\[([^\]]+)\]\(([^)]+)\)|https:\/\/[^\s)]+/g;
  let last = 0;
  for (const match of input.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > last) {
      nodes.push({ type: "text", value: input.slice(last, index) });
    }
    if (match[1] !== undefined) {
      nodes.push({ type: "strong", value: match[1] });
    } else if (match[2] !== undefined) {
      nodes.push({ type: "em", value: match[2] });
    } else if (match[3] !== undefined && match[4] !== undefined) {
      nodes.push({ type: "link", value: match[3], href: match[4] });
    } else if (match[0].startsWith("https://")) {
      nodes.push({ type: "link", href: match[0], value: match[0] });
    }
    last = index + match[0].length;
  }
  if (last < input.length) {
    nodes.push({ type: "text", value: input.slice(last) });
  }
  return nodes;
}

function parseBlocks(body: string): Block[] {
  const lines = body.split(/\r?\n/);
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === "") {
      i += 1;
      continue;
    }

    const figure = FIGURES[line.trim()];
    if (figure) {
      blocks.push({
        type: "figure",
        id: figure.id,
        src: figure.src,
        width: figure.width,
        height: figure.height,
        alt: figure.alt,
        title: figure.title,
        caption: parseInlines(figure.caption),
      });
      i += 1;
      continue;
    }

    if (line.trim().startsWith("[Fig.")) {
      throw new Error(`Unknown blog figure marker: ${line.trim()}`);
    }

    if (line.startsWith("- ")) {
      const items: InlineNode[][] = [];
      while (i < lines.length && lines[i].startsWith("- ")) {
        items.push(parseInlines(lines[i].slice(2)));
        i += 1;
      }
      blocks.push({ type: "list", items });
      continue;
    }

    const paragraph: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].startsWith("- ") &&
      !FIGURES[lines[i].trim()]
    ) {
      if (lines[i].trim().startsWith("[Fig.")) {
        throw new Error(`Unknown blog figure marker: ${lines[i].trim()}`);
      }
      paragraph.push(lines[i]);
      i += 1;
    }
    blocks.push({ type: "paragraph", inlines: parseInlines(paragraph.join(" ")) });
  }

  return blocks;
}

function readPost(filePath: string): Post {
  const slug = path.basename(filePath, ".md");
  const raw = fs.readFileSync(filePath, "utf8");
  const { data, body } = parseFrontmatter(raw);
  const title = data.title;
  const date = data.date;
  const description = data.description;
  if (!title || !date || !description) {
    throw new Error(`Blog post ${slug} needs title, date, and description.`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`Blog post ${slug} date must be YYYY-MM-DD.`);
  }
  return {
    slug,
    title,
    date,
    description,
    canonicalUrl: postCanonicalUrl(slug),
    blocks: parseBlocks(body),
  };
}

export function getPosts(): Post[] {
  if (!fs.existsSync(BLOG_DIR)) return [];
  return fs
    .readdirSync(BLOG_DIR)
    .filter((name) => name.endsWith(".md"))
    .map((name) => readPost(path.join(BLOG_DIR, name)))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.slug.localeCompare(b.slug)));
}

export function getPost(slug: string): Post | undefined {
  return getPosts().find((post) => post.slug === slug);
}
