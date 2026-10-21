import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
// @ts-ignore -- untyped .mjs test helper
import { ROOT, bodyBlocksOf, figuresOf, importRepo, renderPost } from "./support/blog-render.mjs";

// Blog renderer spec (PR #40):
// (1) lib/ parses markdown into a typed block union; BlogArticle maps it with an exhaustive switch.
// (2) Image src is /blog/<lowercase>.png or allow-listed, exists at build time, size from the PNG IHDR.
// (3) No raw HTML: comments stripped, other tag-like text is literal. No dangerouslySetInnerHTML.
// (4) Caption = only the *…* line directly under an image line, rendered as text.

/** Minimal PNG: signature plus an IHDR chunk (enough for the size reader). */
function png(width: number, height: number): Buffer {
  const buf = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buf, 0);
  buf.writeUInt32BE(13, 8);
  buf.write("IHDR", 12, "ascii");
  buf.writeUInt32BE(width, 16);
  buf.writeUInt32BE(height, 20);
  buf[24] = 8;
  buf[25] = 6;
  return buf;
}

function fakePublic(): string {
  const dir = mkdtempSync(join(tmpdir(), "blog-public-"));
  mkdirSync(join(dir, "blog"));
  mkdirSync(join(dir, "assets"));
  writeFileSync(join(dir, "blog", "fig-ok.png"), png(123, 45));
  writeFileSync(join(dir, "blog", "not-a-png.png"), "GIF89a not a png");
  writeFileSync(join(dir, "assets", "architecture-ribbons-reviewed.png"), png(2400, 1349));
  writeFileSync(join(dir, "assets", "hero-A2-labeled.png"), png(10, 10));
  return dir;
}

async function blogParse() {
  return importRepo("lib/blog-parse.ts");
}

async function resolverFor(publicDir: string) {
  const images = await importRepo("lib/blog-images.ts");
  return images.createImageResolver(publicDir);
}

async function renderBlocks(blocks: unknown[]): Promise<string> {
  const { createRequire } = await import("node:module");
  const require = createRequire(import.meta.url);
  const React = require("react");
  const { renderToStaticMarkup } = require("react-dom/server");
  const { BlogArticle } = await importRepo("components/BlogArticle.tsx");
  const post = {
    slug: "fixture",
    title: "Fixture",
    date: "2026-10-21",
    description: "Fixture",
    canonicalUrl: "https://blog.fieldsintelligence.com/fixture",
    blocks,
  };
  return renderToStaticMarkup(React.createElement(BlogArticle, { post }));
}

async function parse(body: string) {
  const { parseBlocks } = await blogParse();
  return parseBlocks(body, await resolverFor(fakePublic()));
}

test("parses headings, paragraphs, bullet and ordered lists into typed blocks", async () => {
  const blocks = await parse(
    [
      "## What they did",
      "",
      "First line with **bold** and a [link](https://example.com/a),",
      "joined to the next line.",
      "",
      "- one",
      "- two",
      "",
      "1. first",
      "2. second",
    ].join("\n"),
  );
  assert.deepEqual(
    blocks.map((b: { kind: string }) => b.kind),
    ["heading2", "paragraph", "bulletList", "orderedList"],
  );
  assert.deepEqual(blocks[0], { kind: "heading2", text: "What they did" });
  assert.deepEqual(blocks[1].text, [
    { type: "text", value: "First line with " },
    { type: "strong", value: "bold" },
    { type: "text", value: " and a " },
    { type: "link", value: "link", href: "https://example.com/a" },
    { type: "text", value: ", joined to the next line." },
  ]);
  assert.equal(blocks[2].items.length, 2);
  assert.deepEqual(blocks[3].items, [
    [{ type: "text", value: "first" }],
    [{ type: "text", value: "second" }],
  ]);

  const html = await renderBlocks(blocks);
  assert.match(html, /<h2\b[^>]*>What they did<\/h2>/);
  assert.deepEqual(
    bodyBlocksOf(html).filter((b: { kind: string }) => b.kind === "ol" || b.kind === "ul"),
    [
      { kind: "ul", items: ["one", "two"] },
      { kind: "ol", items: ["first", "second"] },
    ],
  );
  assert.match(html, /<a href="https:\/\/example.com\/a"[^>]*>link<\/a>/);
});

test("figure: image line, caption only from the *…* line directly under it, as plain text", async () => {
  const blocks = await parse(
    [
      "![Alt with <b>tag</b> & stuff](/blog/fig-ok.png)",
      "*Caption with **bold** and [a link](https://example.com) kept literal*",
      "",
      "![Second](/assets/architecture-ribbons-reviewed.png)",
      "",
      "*not a caption: a blank line separates it*",
    ].join("\n"),
  );
  assert.deepEqual(blocks[0], {
    kind: "figure",
    src: "/blog/fig-ok.png",
    alt: "Alt with <b>tag</b> & stuff",
    width: 123,
    height: 45,
    caption: "Caption with **bold** and [a link](https://example.com) kept literal",
  });
  assert.deepEqual(blocks[1], {
    kind: "figure",
    src: "/assets/architecture-ribbons-reviewed.png",
    alt: "Second",
    width: 2400,
    height: 1349,
  });
  assert.equal(blocks[2].kind, "paragraph");

  const html = await renderBlocks(blocks);
  const figures = figuresOf(html);
  assert.equal(figures.length, 2);
  assert.equal(figures[0].caption, "Caption with **bold** and [a link](https://example.com) kept literal");
  assert.equal(figures[1].caption, null);
  assert.ok(!/<figcaption\b[^>]*>[\s\S]*?<(a|strong|em)\b[\s\S]*?<\/figcaption>/.test(html), "caption must be text only");
  assert.ok(html.includes('alt="Alt with &lt;b&gt;tag&lt;/b&gt; &amp; stuff"'), "alt must be escaped text");
});

test("images render as plain <img> with IHDR width/height, never next/image", async () => {
  const blocks = await parse("![Alt](/blog/fig-ok.png)");
  const html = await renderBlocks(blocks);
  const [figure] = figuresOf(html);
  assert.equal(figure.src, "/blog/fig-ok.png");
  assert.equal(figure.width, "123");
  assert.equal(figure.height, "45");
  assert.ok(!html.includes("/_next/image"));
  assert.ok(!figure.img.includes("srcSet") && !figure.img.includes("srcset"), "no next/image srcset");
  const article = readFileSync(join(ROOT, "components", "BlogArticle.tsx"), "utf8");
  assert.ok(!/from\s+["']next\/image["']/.test(article), "BlogArticle must not import next/image");
});

test("image allow-list rejects everything outside /blog/<lowercase>.png and the explicit list", async () => {
  const images = await importRepo("lib/blog-images.ts");
  const resolve = images.createImageResolver(fakePublic());
  const rejected = [
    "https://example.com/blog/x.png",
    "//example.com/blog/x.png",
    "http://fieldsintelligence.com/blog/fig-ok.png",
    "javascript:alert(1)",
    "data:image/png;base64,iVBORw0KGgo=",
    "/blog/../assets/hero-A2-labeled.png",
    "/blog/Fig-OK.png",
    "/blog/fig_ok.png",
    "/blog/fig-ok.jpg",
    "/blog/fig-ok.svg",
    "/blog/sub/fig-ok.png",
    "/assets/hero-A2-labeled.png",
    "blog/fig-ok.png",
    "fig-ok.png",
    "/blog/fig-ok.png?x=1",
  ];
  for (const src of rejected) {
    assert.equal(images.isAllowedImageSrc(src), false, `allowed: ${src}`);
    assert.throws(() => resolve(src), /image/i, `resolver accepted ${src}`);
  }
  assert.deepEqual([...images.ALLOWED_IMAGE_SRCS].includes("/assets/architecture-ribbons-reviewed.png"), true);
  for (const extra of images.ALLOWED_IMAGE_SRCS) {
    assert.ok(
      extra === "/assets/architecture-ribbons-reviewed.png" || /^\/blog\/[A-Za-z0-9-]+\.png$/.test(extra),
      `unexpected allow-list entry ${extra}`,
    );
  }
  assert.throws(() => resolve("/blog/missing.png"), /missing|not found|exist/i);
  assert.throws(() => resolve("/blog/not-a-png.png"), /png/i);
  assert.deepEqual(resolve("/blog/fig-ok.png"), { width: 123, height: 45 });

  const { parseBlocks } = await blogParse();
  assert.throws(() => parseBlocks("![x](javascript:alert(1))", resolve), /image/i);
  assert.throws(() => parseBlocks("![x](https://example.com/x.png)", resolve), /image/i);
  assert.throws(() => parseBlocks("![broken(/blog/fig-ok.png)", resolve), /image/i);
});

test("no raw HTML: comments are stripped, other tags render as literal text", async () => {
  const blocks = await parse(
    [
      "Before <!-- internal note /workspace/secret --> after.",
      "",
      "<!--",
      "multi-line author note",
      "-->",
      "",
      "<script>alert(1)</script>",
      "",
      '<img src="x" onerror="alert(1)">',
      "",
      "A [bad link](javascript:alert(1)) and a [data link](data:text/html,hi).",
    ].join("\n"),
  );
  const html = await renderBlocks(blocks);
  assert.ok(!html.includes("internal note") && !html.includes("/workspace/secret"));
  assert.ok(!html.includes("multi-line author note"));
  assert.ok(html.includes("Before  after.") || html.includes("Before after."));
  assert.ok(!/<script\b/i.test(html), "script tag rendered as HTML");
  assert.ok(html.includes("&lt;script&gt;alert(1)&lt;/script&gt;"));
  assert.ok(!/<img src="x"/.test(html), "raw img tag rendered as HTML");
  assert.ok(!/href="(javascript|data):/i.test(html), "unsafe link href rendered");
  assert.ok(html.includes("bad link") && html.includes("data link"));
});

test("unsupported markdown fails loudly instead of rendering wrong", async () => {
  for (const body of ["# Top heading", "### Third level", "[Fig. 1 — API retention annotated]"]) {
    await assert.rejects(async () => parse(body), /unsupported|heading|marker/i, `accepted: ${body}`);
  }
});

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const abs = join(dir, name);
    if (statSync(abs).isDirectory()) walk(abs, out);
    else out.push(abs);
  }
  return out;
}

test("blog path has no dangerouslySetInnerHTML, and the block switch is exhaustive", () => {
  const files = [
    join(ROOT, "lib", "blog.ts"),
    join(ROOT, "lib", "blog-parse.ts"),
    join(ROOT, "lib", "blog-images.ts"),
    join(ROOT, "components", "BlogArticle.tsx"),
    ...walk(join(ROOT, "app", "blog")),
  ];
  for (const file of files) {
    const source = readFileSync(file, "utf8");
    assert.ok(!source.includes("dangerouslySetInnerHTML"), `${file} uses dangerouslySetInnerHTML`);
  }
  const article = readFileSync(join(ROOT, "components", "BlogArticle.tsx"), "utf8");
  assert.match(article, /switch\s*\(\s*block\.kind\s*\)/, "BlogArticle must switch on block.kind");
  assert.match(article, /:\s*never\b/, "BlogArticle switch needs a never-check default");
  const parser = readFileSync(join(ROOT, "lib", "blog-parse.ts"), "utf8");
  for (const kind of ["Paragraph", "Heading2", "BulletList", "OrderedList", "Figure"]) {
    assert.match(parser, new RegExp(`export type ${kind}\\b`), `missing block type ${kind}`);
  }
});

test("real posts render through the same path", async () => {
  const blog = await importRepo("lib/blog.ts");
  for (const post of blog.getPosts()) {
    const { html } = await renderPost(post.slug);
    for (const figure of figuresOf(html)) {
      assert.ok(figure.width && figure.height, `${post.slug}: ${figure.src} lacks width/height`);
    }
  }
});
