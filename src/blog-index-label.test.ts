import assert from "node:assert/strict";
import { test } from "node:test";
// @ts-ignore -- untyped .mjs test helper
import { renderBlogIndex, textOf } from "./support/blog-render.mjs";

// PR #40: the blog index label uses the full company name.

test('blog index label reads "Fields Intelligence", never bare "Fields"', async () => {
  const html = await renderBlogIndex();
  const label = /<p class="[^"]*text-brass[^"]*">([\s\S]*?)<\/p>/.exec(html);
  assert.ok(label, "brass label missing");
  assert.equal(textOf(label[1]), "Fields Intelligence");
  const elementTexts = [...html.matchAll(/>([^<>]+)</g)].map((m) => m[1].trim());
  assert.ok(!elementTexts.includes("Fields"), 'bare "Fields" on the blog index');
});
