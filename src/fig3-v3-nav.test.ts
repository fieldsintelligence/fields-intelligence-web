import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

// Ship calls 2026-10-21: Fig. 3 v3 caption (Zak, 9:43 AM CT) and the header
// "How it works" link pointing to /how-it-works (President, option (a)).

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// sha256 of Marketing's v3 export, confirmed by Marketing.
const FIG3_V3_SHA256 =
  "6af8e085ac6908cf83c06dc8a3a4f07e9783b1f44aebaa16aa025f4f45f5ea60";

const FIG3_CAPTION =
  "Fields Intelligence illustration. API request → ZDR inference (no context written to disk, no prompt or response logging) → API response. That’s the whole graph.";

test("Fig. 3 caption uses the v3 wording", () => {
  const source = readFileSync(join(ROOT, "lib", "blog.ts"), "utf8");
  assert.ok(source.includes(JSON.stringify(FIG3_CAPTION)), "Fig. 3 caption is not the v3 wording");
});

test("Fig. 3 PNG is Marketing's v3 export, byte for byte", () => {
  const png = readFileSync(
    join(ROOT, "public", "blog", "blog-fields-intelligence-true-zdr-path.png"),
  );
  assert.equal(createHash("sha256").update(png).digest("hex"), FIG3_V3_SHA256);
});

test('header nav "How it works" links to /how-it-works', () => {
  const source = readFileSync(join(ROOT, "lib", "site.ts"), "utf8");
  const items = [...source.matchAll(/\{\s*href:\s*"([^"]*)",\s*label:\s*"How it works"\s*\}/g)];
  assert.equal(items.length, 1, 'expected exactly one "How it works" nav item');
  assert.equal(items[0]?.[1], "/how-it-works");
});
