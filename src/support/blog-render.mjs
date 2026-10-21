// Renders blog pages to static HTML for tests, through the real lib/ and
// components/ code (see ./tsx-hooks.mjs).
import { existsSync } from "node:fs";
import { createRequire, register } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

register("./tsx-hooks.mjs", import.meta.url);

const require = createRequire(import.meta.url);
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** Import a repo module (path relative to the repo root), or fail with a clear message. */
export async function importRepo(relPath) {
  const file = join(ROOT, relPath);
  if (!existsSync(file)) throw new Error(`${relPath} is missing`);
  return import(pathToFileURL(file).href);
}

export async function renderPost(slug) {
  const blog = await importRepo("lib/blog.ts");
  const post = blog.getPost(slug);
  if (!post) throw new Error(`no blog post with slug ${slug}`);
  const { BlogArticle } = await importRepo("components/BlogArticle.tsx");
  return { post, html: renderToStaticMarkup(React.createElement(BlogArticle, { post })) };
}

export async function renderBlogIndex() {
  const page = await importRepo("app/blog/page.tsx");
  return renderToStaticMarkup(React.createElement(page.default));
}

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

export function decodeEntities(text) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, name) => {
    if (name[0] === "#") {
      const code = name[1] === "x" || name[1] === "X" ? parseInt(name.slice(2), 16) : Number(name.slice(1));
      return String.fromCodePoint(code);
    }
    return ENTITIES[name.toLowerCase()] ?? whole;
  });
}

const INLINE_TAGS = /<\/?(?:a|strong|em|span|b|i|time|code)\b[^>]*>/g;

/** Visible text of an HTML fragment: inline tags dropped, other tags become spaces, entities decoded, whitespace collapsed. */
export function textOf(html) {
  return decodeEntities(html.replace(INLINE_TAGS, "").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

export function attr(tag, name) {
  const match = new RegExp(`\\s${name}="([^"]*)"`).exec(tag);
  return match ? decodeEntities(match[1]) : undefined;
}

/** Figures in document order: img src/alt/width/height and figcaption text. */
export function figuresOf(html) {
  return [...html.matchAll(/<figure\b[^>]*>([\s\S]*?)<\/figure>/g)].map((m) => {
    const inner = m[1];
    const img = /<img\b[^>]*>/.exec(inner)?.[0] ?? "";
    const caption = /<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/.exec(inner);
    return {
      img,
      src: attr(img, "src"),
      alt: attr(img, "alt"),
      width: attr(img, "width"),
      height: attr(img, "height"),
      caption: caption ? textOf(caption[1]) : null,
    };
  });
}

/** Article body after </header>, as ordered blocks: h2, p, ul/ol items, figure. */
export function bodyBlocksOf(html) {
  const start = html.indexOf("</header>");
  const body = start === -1 ? html : html.slice(start + "</header>".length);
  const blocks = [];
  const re = /<(h2|p|ul|ol|figure)\b[^>]*>([\s\S]*?)<\/\1>/g;
  for (const m of body.matchAll(re)) {
    const [, tag, inner] = m;
    if (tag === "ul" || tag === "ol") {
      blocks.push({
        kind: tag,
        items: [...inner.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/g)].map((li) => textOf(li[1])),
      });
    } else if (tag === "figure") {
      blocks.push({ kind: "figure", ...figuresOf(m[0])[0] });
    } else {
      blocks.push({ kind: tag, text: textOf(inner) });
    }
  }
  return blocks;
}
