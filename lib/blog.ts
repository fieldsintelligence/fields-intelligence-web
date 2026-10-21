import fs from "node:fs";
import path from "node:path";
import { site } from "@/lib/site";
import { createImageResolver } from "@/lib/blog-images";
import { parseBlocks, parseFrontmatter, type Block } from "@/lib/blog-parse";

export { formatBlogDate } from "@/lib/blog-parse";
export type {
  Block,
  BulletList,
  CaptionInline,
  Figure,
  Heading2,
  InlineNode,
  OrderedList,
  Paragraph,
} from "@/lib/blog-parse";

const BLOG_DIR = path.join(process.cwd(), "content/blog");
const PUBLIC_DIR = path.join(process.cwd(), "public");

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
    blocks: parseBlocks(body, createImageResolver(PUBLIC_DIR), {
      file: `content/blog/${slug}.md`,
      line: raw.slice(0, raw.indexOf(body)).split("\n").length,
    }),
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

/** Thrown when there are no posts, so a build without blog content fails. */
export class NoBlogPostsError extends Error {
  constructor() {
    super("No blog posts found in content/blog.");
    this.name = "NoBlogPostsError";
  }
}

/**
 * Newest post: the greatest front-matter date (ISO YYYY-MM-DD, compared with
 * plain < and >). A tie goes to the lower slug by code-unit order (plain <).
 */
export function newestPost<T extends Pick<Post, "slug" | "date">>(posts: readonly T[]): T {
  if (posts.length === 0) throw new NoBlogPostsError();
  let best = posts[0];
  for (const post of posts.slice(1)) {
    if (post.date > best.date || (post.date === best.date && post.slug < best.slug)) {
      best = post;
    }
  }
  return best;
}
