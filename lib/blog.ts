import fs from "node:fs";
import path from "node:path";
import { site } from "@/lib/site";
import { createImageResolver } from "@/lib/blog-images";
import { parseBlocks, parseFrontmatter, type Block } from "@/lib/blog-parse";

export { formatBlogDate } from "@/lib/blog-parse";
export type { Block, BulletList, Figure, Heading2, InlineNode, OrderedList, Paragraph } from "@/lib/blog-parse";

const BLOG_DIR = path.join(process.cwd(), "content/blog");
const PUBLIC_DIR = path.join(process.cwd(), "public");

/** First post. Homepage punch and the canonical URL stay pointed here. */
export const CANONICAL_POST_SLUG =
  "zero-retention-isnt-zero-if-someone-still-reads-your-prompts-for-safety";

export const blogIndexUrl = site.blogUrl;

export function postCanonicalUrl(slug: string): string {
  return `${site.blogUrl}/${slug}`;
}

export type Post = {
  slug: string;
  title: string;
  date: string;
  description: string;
  canonicalUrl: string;
  blocks: Block[];
};

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
    blocks: parseBlocks(body, createImageResolver(PUBLIC_DIR)),
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
