import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
// @ts-ignore -- untyped .mjs test helper
import { attr, bodyBlocksOf, decodeEntities, figuresOf, renderPost, textOf } from "./support/blog-render.mjs";

// Pin of the ZDR post's rendered output, written before the blog renderer
// rewrite and the switch to plain <img> (PR #40, spec point 5). It must pass
// unchanged on every commit of that work.

const SLUG = "zero-retention-isnt-zero-if-someone-still-reads-your-prompts-for-safety";

const SOURCE_URL = "https://developers.openai.com/api/docs/guides/private-safety-processing";

const FIGURES = [
  {
    src: "/blog/blog-openai-api-retention-NotZDR.png",
    alt: "Annotated OpenAI API Request and Retention diagram, stamped ZDR!?",
    title: "Fig. 1 — API request and retention (annotated)",
    caption: `Annotated from OpenAI’s published “API Request and Retention” diagram in ZDR with Private Safety Processing. Original diagram © OpenAI; red ellipse and “ZDR!?” annotations by Fields Intelligence for commentary. Source: ${SOURCE_URL}`,
  },
  {
    src: "/blog/blog-openai-async-safety-NotZDR.png",
    alt: "Annotated OpenAI Asynchronous Safety Pipeline diagram, stamped ZDR!?",
    title: "Fig. 2 — Asynchronous safety pipeline (annotated)",
    caption: `Annotated from OpenAI’s published “Asynchronous Safety Pipeline” diagram in ZDR with Private Safety Processing. Original diagram © OpenAI; green OK / red X and “ZDR!?” annotations by Fields Intelligence for commentary. Source: ${SOURCE_URL}`,
  },
  {
    src: "/blog/blog-fields-intelligence-true-zdr-path.png",
    alt: "Fields Intelligence true ZDR path: API request, ZDR inference, API response",
    title: "Fig. 3 — Fields Intelligence true ZDR path",
    caption:
      "Fields Intelligence illustration. API request → ZDR inference (no context written to disk, no prompt or response logging) → API response. That’s the whole graph.",
  },
];

// sha256 of the ZDR post's non-figure body blocks (kind + visible text), as rendered before the rewrite.
const BODY_TEXT_SHA256 = "67fb87f816be1c406ad16728f558ab8cd6412f091039f5c388a58e5d419467c4";

test("ZDR post figures: src, alt, title and caption text, and order are pinned", async () => {
  const { html } = await renderPost(SLUG);
  const figures = figuresOf(html);
  assert.equal(figures.length, FIGURES.length);
  FIGURES.forEach((want, index) => {
    const got = figures[index];
    assert.equal(got.src, want.src, `figure ${index + 1} src`);
    assert.equal(got.alt, want.alt, `figure ${index + 1} alt`);
    const caption = got.caption ?? "";
    const titleAt = caption.indexOf(want.title);
    assert.ok(titleAt >= 0, `figure ${index + 1} caption lacks title: ${caption}`);
    assert.ok(
      caption.indexOf(want.caption, titleAt + want.title.length) >= 0,
      `figure ${index + 1} caption text changed: ${caption}`,
    );
  });
});

test("ZDR post body text outside the figures is unchanged", async () => {
  const { html } = await renderPost(SLUG);
  const blocks = bodyBlocksOf(html)
    .filter((block: { kind: string }) => block.kind !== "figure")
    .map((block: { kind: string; text?: string; items?: string[] }) => [block.kind, block.text ?? block.items]);
  const digest = createHash("sha256").update(JSON.stringify(blocks)).digest("hex");
  assert.equal(digest, BODY_TEXT_SHA256);
});

// The plain caption PR #40 renders: one italic paragraph, title and caption joined
// with ". ", no inline markup and no link. The caption-inline follow-up updates this
// pin on purpose.
const FIGCAPTION_CLASS = "mx-auto mt-4 max-w-3xl text-sm italic leading-relaxed text-slate";

test("ZDR post figcaptions: exact plain structure is pinned", async () => {
  const { html } = await renderPost(SLUG);
  const captions = [...html.matchAll(/<figcaption\b([^>]*)>([\s\S]*?)<\/figcaption>/g)];
  assert.equal(captions.length, FIGURES.length);
  FIGURES.forEach((want, index) => {
    const [, attrs, inner] = captions[index];
    assert.equal(attrs, ` class="${FIGCAPTION_CLASS}"`, `figure ${index + 1} figcaption attributes`);
    assert.ok(!inner.includes("<"), `figure ${index + 1} figcaption has markup: ${inner}`);
    assert.equal(decodeEntities(inner), `${want.title}. ${want.caption}`, `figure ${index + 1} figcaption`);
  });
});

/** Article body after </header>, figures excluded. */
function bodyHtml(html: string): string {
  const start = html.indexOf("</header>");
  assert.ok(start >= 0, "article header missing");
  return html.slice(start + "</header>".length).replace(/<figure\b[\s\S]*?<\/figure>/g, "");
}

test("ZDR post links: every href in the article, in order, is pinned", async () => {
  const { html } = await renderPost(SLUG);
  const links = [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].map(([, attrs, inner]) => ({
    href: attr(attrs, "href"),
    rel: attr(attrs, "rel") ?? null,
    text: textOf(inner),
  }));
  assert.deepEqual(links, [
    { href: "/blog", rel: null, text: "Blog" },
    { href: SOURCE_URL, rel: "noreferrer", text: "their guide" },
  ]);
});

test("ZDR post body: bold and italic placement is pinned", async () => {
  const body = bodyHtml((await renderPost(SLUG)).html);
  const blocks = [...body.matchAll(/<(h2|p|ul|ol)\b[^>]*>([\s\S]*?)<\/\1>/g)];
  // [block index, tag, text, offset in the block's visible text]. The body has no italic.
  const marks: [number, string, string, number][] = [];
  blocks.forEach(([, , inner], index) => {
    const visible = textOf(inner);
    for (const [, tag, text] of inner.matchAll(/<(strong|em)\b[^>]*>([\s\S]*?)<\/\1>/g)) {
      marks.push([index, tag, textOf(text), visible.indexOf(textOf(text))]);
    }
  });
  assert.deepEqual(marks, [
    [1, "strong", "complexity sold as security", 295],
    [2, "strong", "bounded safety signals", 241],
    [3, "strong", "if a pipeline retains interaction content or extracts safety residue from it, it is not true zero data retention for NPI.", 330],
    [4, "strong", "ZDR!?", 42],
  ]);
});
