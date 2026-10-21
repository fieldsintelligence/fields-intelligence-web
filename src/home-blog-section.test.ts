import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, relative } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
// @ts-ignore -- untyped .mjs test helper; registers the TSX loader
import { importRepo } from "./support/blog-render.mjs";

// #52 r5 + r7. newestPost is pure and tested with in-memory posts.
// Nothing here writes to content/blog. The homepage Blog section replaces
// the static ZeroRetention copy, shows that post, and ends with the blog index.

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel: string): string => readFileSync(join(ROOT, rel), "utf8");
const require = createRequire(import.meta.url);
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

const BLOG_INDEX = "https://blog.fieldsintelligence.com/";
const CHECK_THE_BLOG = "Check the blog \u2192";
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const RSQ = "\u2019";
const LDQ = "\u201c";
const RDQ = "\u201d";
const STATIC_PARAGRAPH =
  `Zero Data Retention from a hyperscaler still means someone else${RSQ}s safety pipeline gets a cut of your prompts. Fields Intelligence draws a harder line: Sovereign AI for NPI. The harness and its tools run on your systems. Inference runs on ours, and we do not log prompts or responses. We keep usage records, never prompt or response content. We provide the private inference tool; you own the audit trail and what ${LDQ}safe${RDQ} means for your institution.`;
const STATIC_LINK = "Read the post \u2192";

const BUILT_HOME = join(ROOT, ".next", "server", "app", "index.html");
const IN_CI = process.env.CI === "true";
const HAS_BUILD = existsSync(BUILT_HOME);

const NAMED: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

type ShownPost = {
  slug: string;
  title: string;
  date: string;
  description: string;
  canonicalUrl: string;
};

type FixturePost = ShownPost & { blocks: [] };

function decode(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, name: string) => {
    if (name[0] === "#") {
      const code = name[1] === "x" || name[1] === "X" ? parseInt(name.slice(2), 16) : Number(name.slice(1));
      if (!Number.isFinite(code)) return whole;
      const char = String.fromCodePoint(code);
      return char === "\u00a0" ? " " : char;
    }
    return NAMED[name.toLowerCase()] ?? whole;
  });
}

function collapse(text: string): string {
  return decode(text).replace(/\s+/g, " ").trim();
}

function filesUnder(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const abs = join(dir, entry.name);
    if (entry.name === "node_modules" || entry.name === ".next") return [];
    return entry.isDirectory() ? filesUnder(abs) : [abs];
  });
}

function post(fields: Omit<FixturePost, "blocks" | "canonicalUrl"> & { canonicalUrl?: string }): FixturePost {
  return {
    ...fields,
    canonicalUrl: fields.canonicalUrl ?? `${BLOG_INDEX}${fields.slug}`,
    blocks: [],
  };
}

/** Same rule the section must use: later ISO date wins; a tie uses plain `<` on the slug. */
function pickNewest<T extends ShownPost>(posts: readonly T[]): T {
  return posts.reduce((best, item) => {
    if (item.date > best.date) return item;
    if (item.date < best.date) return best;
    return item.slug < best.slug ? item : best;
  });
}

function withoutScripts(html: string): string {
  return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
}

function sectionsOf(html: string): string[] {
  return [...withoutScripts(html).matchAll(/<section\b[^>]*>[\s\S]*?<\/section>/g)].map((match) => match[0]);
}

function anchors(html: string): { href: string; text: string }[] {
  return [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)].map((match) => ({
    href: decode(/href="([^"]*)"/.exec(match[1])?.[1] ?? ""),
    text: collapse(match[2].replace(/<[^>]+>/g, " ")),
  }));
}

function isPostHref(href: string): boolean {
  return /^https:\/\/blog\.fieldsintelligence\.com\/.+/.test(href) || /^\/blog\/.+/.test(href);
}

function blogSection(html: string): string {
  const sections = sectionsOf(html);
  const marked = sections.filter((section) => section.includes('id="blog"'));
  if (marked.length === 1) return marked[0];
  const eyebrow = sections.filter((section) => />\s*Blog\s*<\/p>/.test(section));
  assert.equal(eyebrow.length, 1, `homepage Blog section was not found (id="blog" sections: ${marked.length})`);
  return eyebrow[0];
}

function idCount(html: string): number {
  return withoutScripts(html).match(/id="blog"/g)?.length ?? 0;
}

function sectionSources(): string[] {
  const rels = new Set<string>();
  if (existsSync(join(ROOT, "components", "ZeroRetention.tsx"))) rels.add("components/ZeroRetention.tsx");
  if (existsSync(join(ROOT, "app", "page.tsx"))) rels.add("app/page.tsx");
  for (const dir of ["app", "components", "src/components"]) {
    for (const abs of filesUnder(join(ROOT, dir))) {
      if (!/\.(tsx|jsx)$/.test(abs)) continue;
      const text = readFileSync(abs, "utf8");
      if (/id\s*=\s*["'{]+blog["'}]/.test(text)) rels.add(relative(ROOT, abs));
    }
  }
  return [...rels];
}

async function renderHome(): Promise<string> {
  const page = await importRepo("app/page.tsx");
  return renderToStaticMarkup(React.createElement(page.default));
}

async function renderWithPosts(posts: FixturePost[]): Promise<string> {
  const pageSrc = read("app/page.tsx");
  const specs = [...pageSrc.matchAll(/import\s*\{([^}]+)\}\s*from\s*"@\/components\/([^"]+)"/g)];
  for (const spec of specs) {
    const names = spec[1].split(",").map((name) => name.trim().split(/\s+as\s+/)[0]).filter(Boolean);
    const mod = await importRepo(`components/${spec[2]}.tsx`);
    for (const name of names) {
      const Comp = mod[name];
      if (typeof Comp !== "function") continue;
      try {
        const html = renderToStaticMarkup(React.createElement(Comp, { posts }));
        if (html.includes('id="blog"') || html.includes("&lt;b&gt;x&lt;/b&gt;") || html.includes(CHECK_THE_BLOG)) {
          return html;
        }
      } catch {
        // This component is not the blog section, or it rejects the fixture.
      }
    }
  }
  const mod = await importRepo("components/ZeroRetention.tsx");
  return renderToStaticMarkup(React.createElement(mod.ZeroRetention, { posts }));
}

function outsidePostLinks(html: string): string[] {
  const problems: string[] = [];
  for (const section of sectionsOf(html)) {
    if (section.includes('id="blog"')) continue;
    const links = anchors(section).filter((link) => isPostHref(link.href)).map((link) => link.href);
    if (links.length > 0) problems.push(links.join(", "));
  }
  return problems;
}

test("newestPost returns the newer post, and adding a newer post switches the result", async () => {
  const blog = await importRepo("lib/blog.ts");
  assert.equal(typeof blog.newestPost, "function", "lib/blog.ts must export newestPost(posts)");
  const older = post({ slug: "older-post", title: "Older", date: "2020-01-01", description: "old" });
  const mid = post({ slug: "mid-post", title: "Mid", date: "2024-05-01", description: "mid" });
  const newer = post({ slug: "newer-post", title: "Newer", date: "2026-12-31", description: "new" });
  assert.equal(blog.newestPost([older, mid]).slug, "mid-post");
  assert.equal(blog.newestPost([older, mid, newer]).slug, "newer-post", "adding a newer post did not switch newestPost");
});

test("newestPost breaks date ties toward the lower slug using plain <", async () => {
  const blog = await importRepo("lib/blog.ts");
  assert.equal(typeof blog.newestPost, "function", "lib/blog.ts must export newestPost(posts)");
  const codeUnit = post({ slug: "b", title: "Code unit", date: "2026-01-01", description: "tie" });
  const locale = post({ slug: "ä", title: "Locale", date: "2026-01-01", description: "tie" });
  assert.equal("b" < "ä", true);
  assert.ok("b".localeCompare("ä") > 0, "tie fixture must disagree with localeCompare");
  assert.equal(blog.newestPost([locale, codeUnit]).slug, "b", "tie must use plain <, not localeCompare");
});

test("newestPost([]) throws NoBlogPostsError", async () => {
  const blog = await importRepo("lib/blog.ts");
  assert.equal(typeof blog.newestPost, "function", "lib/blog.ts must export newestPost(posts)");
  let thrown: unknown;
  try {
    blog.newestPost([]);
  } catch (err) {
    thrown = err;
  }
  assert.ok(thrown, "newestPost([]) did not throw");
  const name = thrown instanceof Error ? thrown.name : "";
  const matches =
    (typeof blog.NoBlogPostsError === "function" && thrown instanceof blog.NoBlogPostsError) ||
    name === "NoBlogPostsError";
  assert.equal(matches, true, `newestPost([]) threw ${name || String(thrown)}, expected NoBlogPostsError`);
});

test("blog section renders a <b>x</b> title as text and does not use dangerouslySetInnerHTML", async () => {
  const sources = sectionSources();
  assert.ok(sources.length > 0, "homepage Blog section files were not found");
  for (const rel of sources) {
    const src = read(rel);
    assert.equal(src.includes("dangerouslySetInnerHTML"), false, `${rel} must render the post as text`);
    assert.equal(/["']use client["']/.test(src), false, `${rel} must be a server component`);
  }
  const marked = post({
    slug: "b-x",
    title: "<b>x</b>",
    date: "2026-12-01",
    description: "marked excerpt",
  });
  const older = post({ slug: "older-note", title: "Older note", date: "2020-01-01", description: "old excerpt" });
  const html = await renderWithPosts([older, marked]);
  assert.equal(html.includes("<b>x</b>"), false, "title rendered an HTML <b> element");
  assert.equal(/<b\b/i.test(html), false, "title rendered an HTML <b> element");
  assert.ok(
    html.includes("&lt;b&gt;x&lt;/b&gt;"),
    `title <b>x</b> was not rendered as text. Section HTML starts: ${html.slice(0, 400)}`,
  );
  const titleLink = anchors(html).find((link) => link.text === "<b>x</b>");
  assert.ok(titleLink, "escaped title is not the text of a link");
  assert.equal(titleLink.href, marked.canonicalUrl);
});

test("newest post link href equals canonicalUrl and its slug matches the slug pattern", async () => {
  const blog = await importRepo("lib/blog.ts");
  const newest = pickNewest(blog.getPosts() as ShownPost[]);
  const section = blogSection(await renderHome());
  const titleLink = anchors(section).find((link) => link.text === newest.title);
  assert.ok(titleLink, `newest post title ${JSON.stringify(newest.title)} is not a link in the Blog section`);
  assert.equal(titleLink.href, newest.canonicalUrl, "post href must equal post.canonicalUrl");
  assert.ok(titleLink.href.startsWith(BLOG_INDEX), `post href must start with ${BLOG_INDEX}`);
  const slug = titleLink.href.slice(BLOG_INDEX.length).split(/[?#]/)[0].replace(/\/$/, "");
  assert.match(slug, SLUG_PATTERN, `slug ${JSON.stringify(slug)} does not match ${SLUG_PATTERN}`);
  assert.equal(slug, newest.slug);
});

test("homepage has exactly one id=\"blog\" and no other section links to a post", async () => {
  const problems: string[] = [];
  const rendered = await renderHome();
  const renderedCount = idCount(rendered);
  if (renderedCount !== 1) problems.push(`rendered homepage id="blog" count is ${renderedCount}, expected 1`);
  for (const href of outsidePostLinks(rendered)) {
    problems.push(`rendered section outside id="blog" links to a post: ${href}`);
  }
  if (!HAS_BUILD && IN_CI) assert.ok(HAS_BUILD, "CI=true but .next build output is missing");
  if (HAS_BUILD) {
    const built = readFileSync(BUILT_HOME, "utf8");
    const builtCount = idCount(built);
    if (builtCount !== 1) problems.push(`built homepage id="blog" count is ${builtCount}, expected 1`);
    for (const href of outsidePostLinks(built)) {
      problems.push(`built section outside id="blog" links to a post: ${href}`);
    }
  }
  assert.deepEqual(problems, []);
});

test("homepage blog section shows the newest post title, date, and description", async () => {
  const blog = await importRepo("lib/blog.ts");
  const newest = pickNewest(blog.getPosts() as ShownPost[]);
  const section = collapse(blogSection(await renderHome()));
  const sources = sectionSources().map((rel) => read(rel)).join("\n");
  const problems: string[] = [];
  if (!/newestPost\s*\(/.test(sources)) problems.push("homepage Blog section does not call newestPost");
  if (!/getPosts\s*\(/.test(sources)) problems.push("homepage Blog section does not read getPosts()");
  if (!section.includes(newest.title)) problems.push(`section is missing the newest title ${JSON.stringify(newest.title)}`);
  const date = blog.formatBlogDate(newest.date);
  if (!section.includes(date)) problems.push(`section is missing the blog-index date ${JSON.stringify(date)}`);
  if (!section.includes(newest.description)) {
    problems.push(`section is missing the newest description ${JSON.stringify(newest.description)}`);
  }
  assert.deepEqual(problems, []);
});

test("blog section's last link is Check the blog → to the blog index", async () => {
  const problems: string[] = [];
  const check = (label: string, html: string) => {
    const links = anchors(blogSection(html));
    const last = links[links.length - 1];
    if (!last) {
      problems.push(`${label} Blog section has no links`);
      return;
    }
    if (last.text !== CHECK_THE_BLOG) {
      problems.push(`${label} last link text is ${JSON.stringify(last.text)}, expected ${JSON.stringify(CHECK_THE_BLOG)}`);
    }
    if (last.href !== BLOG_INDEX) {
      problems.push(`${label} last link href is ${JSON.stringify(last.href)}, expected ${JSON.stringify(BLOG_INDEX)}`);
    }
  };
  check("rendered", await renderHome());
  if (!HAS_BUILD && IN_CI) assert.ok(HAS_BUILD, "CI=true but .next build output is missing");
  if (HAS_BUILD) check("built", readFileSync(BUILT_HOME, "utf8"));
  assert.deepEqual(problems, []);
});

test("ZeroRetention static content is gone", async () => {
  const problems: string[] = [];
  const note = (label: string, text: string) => {
    if (text.includes(STATIC_PARAGRAPH)) problems.push(`${label} still has the ZeroRetention paragraph`);
    if (text.includes(STATIC_LINK)) problems.push(`${label} still has ${JSON.stringify(STATIC_LINK)}`);
  };
  for (const dir of ["app", "components"]) {
    for (const abs of filesUnder(join(ROOT, dir))) {
      if (!/\.(tsx|ts|jsx|js)$/.test(abs)) continue;
      note(relative(ROOT, abs), readFileSync(abs, "utf8"));
    }
  }
  note("rendered homepage", await renderHome());
  if (!HAS_BUILD && IN_CI) assert.ok(HAS_BUILD, "CI=true but .next build output is missing");
  if (HAS_BUILD) note("built homepage", readFileSync(BUILT_HOME, "utf8"));
  assert.deepEqual(problems, []);
});
