import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { join, relative } from "node:path";
import { test } from "node:test";
// @ts-ignore -- untyped .mjs test helper
import { ROOT, attr, importRepo, textOf } from "./support/blog-render.mjs";

// Footer "Trust boundary" → the trust box on /how-it-works (PR #43, spec point D).

const require = createRequire(import.meta.url);
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

const TARGET_PATH = "/how-it-works#trust-boundary";

async function siteModule() {
  return importRepo("lib/site.ts");
}

async function footerTrustHref(): Promise<string> {
  const { Footer } = await importRepo("components/Footer.tsx");
  const html = renderToStaticMarkup(React.createElement(Footer));
  const anchors = [...html.matchAll(/<a\b[^>]*>[\s\S]*?<\/a>/g)].map((m) => m[0]);
  const trust = anchors.filter((a) => textOf(a) === "Trust boundary");
  assert.equal(trust.length, 1, "footer needs exactly one Trust boundary link");
  return attr(trust[0], "href");
}

test("apexHref builds absolute apex URLs from the site.url constant only", async () => {
  const { apexHref, site } = await siteModule();
  assert.equal(typeof apexHref, "function", "lib/site.ts must export apexHref");
  assert.equal(apexHref(TARGET_PATH), `${site.url}${TARGET_PATH}`);
  assert.equal(apexHref("/"), `${site.url}/`);
  const source = readFileSync(join(ROOT, "lib", "site.ts"), "utf8");
  const fn = /export function apexHref[\s\S]*?\n}/.exec(source)?.[0] ?? "";
  assert.ok(fn.includes("site.url"), "apexHref must use site.url");
  assert.ok(!/process\.env|headers\(|host/i.test(fn.replace(/apexHref/g, "")), "apexHref must not read env or the Host header");
});

test("footer Trust boundary resolves to /how-it-works#trust-boundary on the apex", async () => {
  const { site } = await siteModule();
  const href = await footerTrustHref();
  const url = new URL(href, `${site.url}/`);
  assert.equal(url.origin, site.url);
  assert.equal(url.pathname, "/how-it-works");
  assert.equal(url.hash, "#trust-boundary");
});

test("footer Trust boundary on the blog host is the absolute apex URL", async () => {
  const { site } = await siteModule();
  const href = await footerTrustHref();
  assert.equal(href, `${site.url}${TARGET_PATH}`);
  assert.equal(new URL(href, `${site.blogUrl}/`).href, `${site.url}${TARGET_PATH}`);
  const footer = readFileSync(join(ROOT, "components", "Footer.tsx"), "utf8");
  assert.ok(footer.includes(`apexHref("${TARGET_PATH}")`), "footer must use apexHref");
});

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const abs = join(dir, name);
    if (statSync(abs).isDirectory()) walk(abs, out);
    else if (/\.(tsx?|md|mdx)$/.test(name)) out.push(abs);
  }
  return out;
}

test('id="trust-boundary" appears exactly once in source, on the trust box rendered only by /how-it-works', async () => {
  const hits = ["app", "components", "lib", "content"]
    .flatMap((dir) => walk(join(ROOT, dir)))
    .flatMap((file) =>
      (readFileSync(file, "utf8").match(/id=["'{`]+trust-boundary/g) ?? []).map(() => relative(ROOT, file)),
    );
  assert.deepEqual(hits, ["components/TrustBoundary.tsx"]);
  const users = ["app", "components"]
    .flatMap((dir) => walk(join(ROOT, dir)))
    .filter((file) => /<TrustBoundary\b/.test(readFileSync(file, "utf8")))
    .map((file) => relative(ROOT, file));
  assert.deepEqual(users, ["app/how-it-works/page.tsx"]);
  const { TrustBoundary } = await importRepo("components/TrustBoundary.tsx");
  const html = renderToStaticMarkup(React.createElement(TrustBoundary));
  assert.equal(html.match(/id="trust-boundary"/g)?.length ?? 0, 1);
});

// CI builds before `npm test`; under CI=true missing build output fails instead of skipping.
const BUILT = join(ROOT, ".next", "server", "app");
const HAS_BUILD = existsSync(join(BUILT, "how-it-works.html"));
const IN_CI = process.env.CI === "true";

function builtHtml(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const abs = join(dir, name);
    if (statSync(abs).isDirectory()) builtHtml(abs, out);
    else if (name.endsWith(".html")) out.push(abs);
  }
  return out;
}

test(
  'built HTML: id="trust-boundary" exactly once site-wide, on /how-it-works',
  { skip: !HAS_BUILD && !IN_CI && "no .next build output (run `npm run build` first)" },
  () => {
    assert.ok(HAS_BUILD, "CI=true but .next build output is missing");
    const hits = builtHtml(BUILT).flatMap((file) =>
      (readFileSync(file, "utf8").match(/id="trust-boundary"/g) ?? []).map(() => relative(BUILT, file)),
    );
    assert.deepEqual(hits, ["how-it-works.html"]);
  },
);
