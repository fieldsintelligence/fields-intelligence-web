import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

// The 404 link and the demo idle line use the full company name.

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel: string): string => readFileSync(join(ROOT, rel), "utf8");

const BUILT = join(ROOT, ".next", "server", "app");
const BUILT_HOME = join(BUILT, "index.html");
const BUILT_404 = join(BUILT, "_not-found.html");
const IN_CI = process.env.CI === "true";
const HAS_BUILD = [BUILT_HOME, BUILT_404].every((abs) => existsSync(abs));
const skipWithoutBuild = !HAS_BUILD && !IN_CI && "no .next build output (run `npm run build` first)";

const LINK = "Back to Fields Intelligence";
const BARE_LINK = /Back to Fields(?! Intelligence)/;
const DEMO = "Inference runs on Fields Intelligence infrastructure";
const BARE_DEMO = "runs on Fields infrastructure";
const FOUNDER = "Fields is a family name.";

/** Text with tags stripped and whitespace collapsed. */
function text(src: string): string {
  return src.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
}

test(`source: 404 link reads "${LINK}"`, () => {
  const src = text(read("app/not-found.tsx"));
  assert.ok(src.includes(LINK), `app/not-found.tsx lacks "${LINK}"`);
  assert.ok(!BARE_LINK.test(src), 'app/not-found.tsx still has a bare "Back to Fields"');
});

test(`source: demo idle line reads "${DEMO}"`, () => {
  const src = text(read("components/ProductDemo.tsx"));
  assert.ok(src.includes(DEMO), `components/ProductDemo.tsx lacks "${DEMO}"`);
  assert.ok(!src.includes(BARE_DEMO), `components/ProductDemo.tsx still has "${BARE_DEMO}"`);
});

test(`source: Founder line "${FOUNDER}" is unchanged`, () => {
  assert.ok(text(read("components/Founder.tsx")).includes(FOUNDER), `components/Founder.tsx lacks "${FOUNDER}"`);
});

test(`built 404 page: link reads "${LINK}"`, { skip: skipWithoutBuild }, () => {
  assert.ok(HAS_BUILD, "CI=true but .next build output is missing");
  const html = readFileSync(BUILT_404, "utf8");
  assert.ok(html.includes(LINK), `built 404 page lacks "${LINK}"`);
  assert.ok(!html.includes("Back to Fields<"), 'built 404 page still has "Back to Fields<"');
  assert.ok(!BARE_LINK.test(html), 'built 404 page still has a bare "Back to Fields"');
});

test(`built homepage: demo reads "${DEMO}"`, { skip: skipWithoutBuild }, () => {
  assert.ok(HAS_BUILD, "CI=true but .next build output is missing");
  const html = text(readFileSync(BUILT_HOME, "utf8"));
  assert.ok(html.includes(DEMO), `built homepage lacks "${DEMO}"`);
  assert.ok(!html.includes(BARE_DEMO), `built homepage still has "${BARE_DEMO}"`);
  assert.ok(html.includes(FOUNDER), `built homepage lacks "${FOUNDER}"`);
});
