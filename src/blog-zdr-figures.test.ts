import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
// @ts-ignore -- untyped .mjs test helper
import { bodyBlocksOf, figuresOf, renderPost } from "./support/blog-render.mjs";

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
