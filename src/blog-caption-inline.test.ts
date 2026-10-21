import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
// @ts-ignore -- untyped .mjs test helper
import { ROOT, figuresOf, importRepo } from "./support/blog-render.mjs";

// Figure caption inline syntax and caption link checks (PR #43, spec points A–C).
// See docs/architecture/blog-renderer.md, "Figure captions".

async function parser() {
  return importRepo("lib/blog-parse.ts");
}

async function renderCaption(caption: unknown[]): Promise<string> {
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
    blocks: [{ kind: "figure", src: "/blog/fig-a-recipe.png", alt: "Alt", width: 10, height: 10, caption }],
  };
  return renderToStaticMarkup(React.createElement(BlogArticle, { post }));
}

function figcaptionOf(html: string): string {
  return /<figcaption\b[\s\S]*?<\/figcaption>/.exec(html)?.[0] ?? "";
}

test("caption inline: **bold**, *italic* and [text](https://…) parse to flat CaptionInline nodes", async () => {
  const { parseCaptionInlines } = await parser();
  assert.deepEqual(parseCaptionInlines("**Title** text *Em* and [the guide](https://openai.com/x)."), [
    { kind: "strong", text: "Title" },
    { kind: "text", text: " text " },
    { kind: "em", text: "Em" },
    { kind: "text", text: " and " },
    { kind: "link", href: "https://openai.com/x", text: "the guide" },
    { kind: "text", text: "." },
  ]);
});

test("caption inline: nested markers do not nest, and never throw", async () => {
  const { parseCaptionInlines } = await parser();
  let nodes: { kind: string; text: string }[] = [];
  assert.doesNotThrow(() => {
    nodes = parseCaptionInlines("**bold *em***");
  });
  assert.deepEqual(nodes, [
    { kind: "strong", text: "bold *em" },
    { kind: "text", text: "*" },
  ]);
  const html = figcaptionOf(await renderCaption(nodes));
  assert.ok(!/<(strong|span)\b[^>]*>[^<]*<em\b/.test(html), "em nested inside strong");
});

test("caption inline: unmatched markers render literally and never throw", async () => {
  const { parseCaptionInlines } = await parser();
  for (const raw of ["**foo", "*foo", "foo**", "[foo", "[foo](", "[foo](https://openai.com/x", "a ** b", "**", "*"]) {
    let nodes: { kind: string; text: string }[] = [];
    assert.doesNotThrow(() => {
      nodes = parseCaptionInlines(raw);
    }, `threw on ${raw}`);
    assert.deepEqual(nodes, [{ kind: "text", text: raw }], `not literal: ${raw}`);
  }
});

test("caption inline: marker and HTML characters inside link text stay literal text", async () => {
  const { parseCaptionInlines } = await parser();
  const nodes = parseCaptionInlines("[a *b* **c** <i>x</i> &amp;](https://openai.com/p)");
  assert.deepEqual(nodes, [{ kind: "link", href: "https://openai.com/p", text: "a *b* **c** <i>x</i> &amp;" }]);
  const html = figcaptionOf(await renderCaption(nodes));
  assert.ok(html.includes(">a *b* **c** &lt;i&gt;x&lt;/i&gt; &amp;amp;</a>"), html);
  assert.ok(!/<i>/.test(html));
});

test("caption link: rejected hrefs throw", async () => {
  const { validateCaptionHref } = await parser();
  const rejected = [
    "javascript:alert(1)",
    "http://openai.com/x",
    "data:text/html,hi",
    "//evil.test/x",
    "https:\\\\evil.test/x",
    "https://openai.com.evil.test/x",
    "https://platform.openai.com.evil.test/x",
    "https://evil.test/openai.com",
    "https://sub.openai.com/x",
    "https://user:pw@openai.com/x",
    "https://user@openai.com/x",
    "https://openai.com:8443/x",
    "https://openai.com./x",
    "https://xn--opnai-3ve.com/x",
    "https://open\u0430i.com/x",
    "https://open%D0%B0i.com/x",
    "https://open%2eai.com/x",
    "https://open\tai.com/x",
    "https://openai.com/\nx",
    "https://openai.com/x\r",
    " https://openai.com/x",
  ];
  for (const href of rejected) {
    assert.throws(() => validateCaptionHref(href, "content/blog/x.md:3"), /content\/blog\/x\.md:3/, `accepted ${JSON.stringify(href)}`);
  }
});

test("caption link: allowed hosts normalize; href is the serialized url.href", async () => {
  const { validateCaptionHref, CAPTION_LINK_HOSTS } = await parser();
  assert.equal(validateCaptionHref("https://openai.com/x", "f:1"), "https://openai.com/x");
  assert.equal(validateCaptionHref("https://OPENAI.COM/x", "f:1"), "https://openai.com/x");
  assert.equal(validateCaptionHref("https://openai.com:443/x", "f:1"), "https://openai.com/x");
  assert.equal(validateCaptionHref("https://platform.openai.com/docs", "f:1"), "https://platform.openai.com/docs");
  assert.ok(CAPTION_LINK_HOSTS.includes("openai.com") && CAPTION_LINK_HOSTS.includes("platform.openai.com"));
  for (const host of CAPTION_LINK_HOSTS) {
    assert.match(host, /^[a-z0-9.-]+$/, `allow-list entry must be an exact lowercase hostname: ${host}`);
    assert.ok(!host.startsWith(".") && !host.endsWith(".") && !host.includes("*"), host);
  }
});

test("caption link violations fail the build with file and line", async () => {
  const { parseBlocks } = await parser();
  const images = await importRepo("lib/blog-images.ts");
  const resolve = images.createImageResolver(join(ROOT, "public"));
  const body = ["Intro.", "", "![Alt](/blog/fig-a-recipe.png)", "*See [this](http://openai.com/x)*"].join("\n");
  assert.throws(
    () => parseBlocks(body, resolve, { file: "content/blog/example.md", line: 6 }),
    /content\/blog\/example\.md:9:/,
  );
});

test("caption links render with rel=noopener noreferrer, no target, serialized href", async () => {
  const { parseCaptionInlines } = await parser();
  const html = figcaptionOf(await renderCaption(parseCaptionInlines("Source: [guide](https://OPENAI.COM:443/a)")));
  assert.match(html, /<a href="https:\/\/openai\.com\/a"[^>]* rel="noopener noreferrer">guide<\/a>/);
  assert.ok(!/target=/.test(html), "caption link must not set target");
});

test("caption rendering: exhaustive switch, React elements only", () => {
  const article = readFileSync(join(ROOT, "components", "BlogArticle.tsx"), "utf8");
  assert.match(article, /switch\s*\(\s*node\.kind\s*\)/, "caption nodes must switch on node.kind");
  assert.ok((article.match(/:\s*never\b/g) ?? []).length >= 2, "caption switch needs its own never-check");
  assert.ok(!article.includes("dangerouslySetInnerHTML"));
  const parse = readFileSync(join(ROOT, "lib", "blog-parse.ts"), "utf8");
  for (const kind of ["CaptionInline", "CaptionText", "CaptionStrong", "CaptionEm", "CaptionLink"]) {
    assert.match(parse, new RegExp(`export type ${kind}\\b`), `missing ${kind}`);
  }
  assert.match(parse, /new URL\(/, "caption links must be parsed with new URL()");
});

test("body paragraphs keep their inline rules", async () => {
  const { parseBlocks } = await parser();
  const images = await importRepo("lib/blog-images.ts");
  const blocks = parseBlocks("A **b** and [x](https://fieldsintelligence.com/y).", images.createImageResolver(join(ROOT, "public")));
  assert.deepEqual(blocks[0].text, [
    { type: "text", value: "A " },
    { type: "strong", value: "b" },
    { type: "text", value: " and " },
    { type: "link", value: "x", href: "https://fieldsintelligence.com/y" },
    { type: "text", value: "." },
  ]);
});

test("figure caption line: blank line still separates a caption from the image", async () => {
  const { parseBlocks } = await parser();
  const images = await importRepo("lib/blog-images.ts");
  const blocks = parseBlocks("![A](/blog/fig-a-recipe.png)\n\n*para*", images.createImageResolver(join(ROOT, "public")));
  assert.equal(blocks[0].caption, undefined);
  assert.equal(blocks[1].kind, "paragraph");
  assert.equal(figuresOf(await renderCaption([{ kind: "text", text: "x" }])).length, 1);
});
