import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

// #63. Header and footer homepage anchors are absolute on site.url, so they
// work from the blog host. The UseCases intro names Fields Intelligence.

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel: string): string => readFileSync(join(ROOT, rel), "utf8");

const APEX_HOST = "fieldsintelligence.com";
const APEX_PREFIX = `https://${APEX_HOST}/`;
const BLOG_ORIGIN = "https://blog.fieldsintelligence.com";
const HEADER_TABS = ["The problem", "How it works", "Industry fit", "Blog", "Founder"];

const BUILT = join(ROOT, ".next", "server", "app");
const BUILT_HOME = join(BUILT, "index.html");
const BUILT_POST = join(BUILT, "blog", "a-backdoor-for-the-price-of-lunch.html");
const BUILT_BLOG_INDEX = join(BUILT, "blog.html");
const IN_CI = process.env.CI === "true";
const HAS_BUILD = [BUILT_HOME, BUILT_POST, BUILT_BLOG_INDEX].every((abs) => existsSync(abs));
const skipWithoutBuild = !HAS_BUILD && !IN_CI && "no .next build output (run `npm run build` first)";

function decode(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function anchors(html: string): { href: string; text: string }[] {
  return [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].map((match) => ({
    href: decode(/href="([^"]*)"/.exec(match[1])?.[1] ?? ""),
    text: decode(match[2].replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim(),
  }));
}

function block(html: string, tag: "header" | "footer"): string {
  const start = html.indexOf(`<${tag}`);
  const end = html.indexOf(`</${tag}>`);
  assert.ok(start >= 0 && end > start, `missing <${tag}>`);
  return html.slice(start, end);
}

function builtHtmlFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    if (!existsSync(dir)) return;
    for (const name of readdirSync(dir)) {
      const abs = join(dir, name);
      if (statSync(abs).isDirectory()) walk(abs);
      else if (name.endsWith(".html") && name !== "_global-error.html") out.push(abs);
    }
  };
  walk(BUILT);
  return out.sort();
}

/** Source href expressions resolved with site.url. */
function resolveExpr(expr: string): string {
  return expr
    .replace(/^\{|\}$/g, "")
    .replace(/^["`]|["`]$/g, "")
    .replace("${site.url}", `https://${APEX_HOST}`);
}

function navHrefs(): string[] {
  const src = read("lib/site.ts");
  const match = src.match(/export const nav = \[([\s\S]*?)\] as const;/);
  assert.ok(match, "lib/site.ts nav array not found");
  return [...match[1].matchAll(/href:\s*("[^"]*"|`[^`]*`)/g)].map((m) => resolveExpr(m[1]));
}

function footerHrefs(): string[] {
  const src = read("components/Footer.tsx");
  return [...src.matchAll(/href=("[^"]*"|\{`[^`]*`\})/g)].map((m) => resolveExpr(m[1]));
}

function intro(text: string): string {
  return text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
}

test("source: every header and footer # href is absolute on the apex", () => {
  const hrefs = [...navHrefs(), ...footerHrefs()].filter((href) => href.includes("#"));
  assert.equal(hrefs.length, 7, `expected 5 header and 2 footer # hrefs, found ${hrefs.length}`);
  const bad = hrefs.filter((href) => !href.startsWith(APEX_PREFIX));
  assert.deepEqual(bad, []);
});

test("source: no header or footer href is a relative /# link", () => {
  const bad = [...navHrefs(), ...footerHrefs()].filter((href) => href.startsWith("/#"));
  assert.deepEqual(bad, []);
  for (const file of ["lib/site.ts", "components/Header.tsx", "components/Footer.tsx"]) {
    assert.ok(!/href[=:]\s*["'`{]*\/#/.test(read(file)), `${file} still has a relative /# href`);
  }
});

test("built pages: every header and footer # href is absolute on the apex", { skip: skipWithoutBuild }, () => {
  assert.ok(HAS_BUILD, "CI=true but .next build output is missing");
  const problems: string[] = [];
  for (const abs of builtHtmlFiles()) {
    const html = readFileSync(abs, "utf8");
    for (const tag of ["header", "footer"] as const) {
      if (!html.includes(`<${tag}`)) continue;
      for (const link of anchors(block(html, tag))) {
        if (link.href.includes("#") && !link.href.startsWith(APEX_PREFIX)) {
          problems.push(`${relative(BUILT, abs)} ${tag} ${link.text} -> ${link.href}`);
        }
      }
    }
  }
  assert.deepEqual(problems, []);
});

test("blog host: each header tab resolves to the apex", { skip: skipWithoutBuild }, () => {
  assert.ok(HAS_BUILD, "CI=true but .next build output is missing");
  const pages: ReadonlyArray<readonly [string, string]> = [
    [BUILT_BLOG_INDEX, `${BLOG_ORIGIN}/`],
    [BUILT_POST, `${BLOG_ORIGIN}/a-backdoor-for-the-price-of-lunch`],
  ];
  const problems: string[] = [];
  for (const [abs, base] of pages) {
    const links = anchors(block(readFileSync(abs, "utf8"), "header"));
    for (const label of HEADER_TABS) {
      const tab = links.filter((link) => link.text === label);
      if (tab.length !== 1) {
        problems.push(`${base} header has ${tab.length} "${label}" tabs`);
        continue;
      }
      const resolved = new URL(tab[0].href, base);
      if (resolved.hostname !== APEX_HOST || resolved.pathname !== "/" || !resolved.hash) {
        problems.push(`${base} "${label}" resolves to ${resolved.href}`);
      }
    }
  }
  assert.deepEqual(problems, []);
});

test('source: UseCases intro reads "Fields Intelligence shows up"', () => {
  const text = intro(read("components/UseCases.tsx"));
  assert.ok(text.includes("Fields Intelligence shows up"), 'UseCases intro lacks "Fields Intelligence shows up"');
  assert.ok(!text.includes("Fields shows up"), 'UseCases intro still reads "Fields shows up"');
});

test('built homepage: UseCases intro reads "Fields Intelligence shows up"', { skip: skipWithoutBuild }, () => {
  assert.ok(HAS_BUILD, "CI=true but .next build output is missing");
  const text = intro(readFileSync(BUILT_HOME, "utf8"));
  assert.ok(text.includes("Fields Intelligence shows up"), 'built homepage lacks "Fields Intelligence shows up"');
  assert.ok(!text.includes("Fields shows up"), 'built homepage still reads "Fields shows up"');
});
