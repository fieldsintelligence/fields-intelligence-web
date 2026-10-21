import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

// #61. Homepage section order, the UseCases eyebrow, header tab labels and
// order, footer anchor order, and no dead homepage anchors. #63: every
// homepage anchor is absolute on site.url.

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel: string): string => readFileSync(join(ROOT, rel), "utf8");

const APEX = "https://fieldsintelligence.com";
const SECTION_COMPONENTS = ["Hero", "Problem", "HowItWorksTeaser", "UseCases", "ZeroRetention", "Founder"];
const SECTION_IDS = ["problem", "sovereign", "use-cases", "blog", "founder"];

const NAV_SOURCE: ReadonlyArray<readonly [string, string]> = [
  ["`${site.url}/#problem`", "The problem"],
  ["`${site.url}/#sovereign`", "How it works"],
  ["`${site.url}/#use-cases`", "Industry fit"],
  ["`${site.url}/#blog`", "Blog"],
  ["`${site.url}/#founder`", "Founder"],
];
const NAV_BUILT: ReadonlyArray<readonly [string, string]> = [
  [`${APEX}/#problem`, "The problem"],
  [`${APEX}/#sovereign`, "How it works"],
  [`${APEX}/#use-cases`, "Industry fit"],
  [`${APEX}/#blog`, "Blog"],
  [`${APEX}/#founder`, "Founder"],
];
const FOOTER_SOURCE: ReadonlyArray<readonly [string, string]> = [
  ["{`${site.url}/#sovereign`}", "Trust boundary"],
  ["{`${site.url}/#use-cases`}", "Industry fit"],
  ['"/how-it-works"', "How it works"],
  ['"/blog"', "Blog"],
  ['"/contact"', "Contact"],
];
const FOOTER_BUILT: ReadonlyArray<readonly [string, string]> = [
  [`${APEX}/#sovereign`, "Trust boundary"],
  [`${APEX}/#use-cases`, "Industry fit"],
  ["/how-it-works", "How it works"],
  ["/blog", "Blog"],
  ["/contact", "Contact"],
];

const BUILT = join(ROOT, ".next", "server", "app");
const BUILT_HOME = join(BUILT, "index.html");
const IN_CI = process.env.CI === "true";
const HAS_BUILD = existsSync(BUILT_HOME);
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

function withoutScripts(html: string): string {
  return html.replace(/<script\b[\s\S]*?<\/script>/g, "");
}

function homeAnchorId(href: string): string | null {
  const match = /^(?:https:\/\/fieldsintelligence\.com)?\/#(.+)$/.exec(href);
  return match ? match[1] : null;
}

function navSource(): [string, string][] {
  const src = read("lib/site.ts");
  const match = src.match(/export const nav = \[([\s\S]*?)\] as const;/);
  assert.ok(match, "lib/site.ts nav array not found");
  return [...match[1].matchAll(/\{\s*href:\s*("[^"]*"|`[^`]*`),\s*label:\s*"([^"]*)"\s*\}/g)].map(
    (m) => [m[1], m[2]],
  );
}

function footerSiteList(src: string): string {
  const start = src.indexOf("On this site");
  assert.ok(start >= 0, 'footer "On this site" not found');
  const end = src.indexOf("</ul>", start);
  assert.ok(end > start, 'footer "On this site" list not closed');
  return src.slice(start, end);
}

function filesUnder(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const abs = join(dir, entry.name);
    return entry.isDirectory() ? filesUnder(abs) : [abs];
  });
}

test("app/page.tsx renders the sections in the #61 order", () => {
  const src = read("app/page.tsx");
  const body = src.slice(src.indexOf("return ("));
  const rendered = [...body.matchAll(/<([A-Z][A-Za-z]*)\s*\/>/g)].map((m) => m[1]);
  assert.deepEqual(rendered, SECTION_COMPONENTS);
});

test('UseCases eyebrow is "Industry fit" and the #use-cases anchor stays', () => {
  const src = read("components/UseCases.tsx");
  assert.match(src, /<p className="[^"]*">Industry fit<\/p>/, 'UseCases eyebrow is not "Industry fit"');
  assert.match(src, /id="use-cases"/, 'UseCases lost id="use-cases"');
});

test('no source file under app, components or lib reads "Where it fits"', () => {
  const hits = ["app", "components", "lib"]
    .flatMap((dir) => filesUnder(join(ROOT, dir)))
    .filter((abs) => readFileSync(abs, "utf8").includes("Where it fits"))
    .map((abs) => relative(ROOT, abs));
  assert.deepEqual(hits, []);
});

test("header nav is exactly the five tabs, labels, hrefs and order", () => {
  assert.deepEqual(navSource(), NAV_SOURCE.map(([href, label]) => [href, label]));
  const src = read("lib/site.ts");
  assert.match(
    src,
    /\/\/ Homepage Blog section\. Absolute apex, so the tab works from the blog host too\.\n\s*\{\s*href:\s*`\$\{site\.url\}\/#blog`,\s*label:\s*"Blog"\s*\}/,
    "the Blog tab lost its comment",
  );
});

test("footer On this site: anchors in page order, then the page links as before", () => {
  const list = footerSiteList(read("components/Footer.tsx"));
  const links = [...list.matchAll(/<Link\s+href=("[^"]*"|\{`[^`]*`\})[^>]*>\s*([^<]*?)\s*<\/Link>/g)].map(
    (m) => [m[1], m[2]],
  );
  assert.deepEqual(links, FOOTER_SOURCE.map(([href, label]) => [href, label]));
});

test("source: every header and footer homepage anchor names an id a homepage section renders", () => {
  const ids = new Set(
    ["app", "components"]
      .flatMap((dir) => filesUnder(join(ROOT, dir)))
      .filter((abs) => abs.endsWith(".tsx"))
      .flatMap((abs) => [...readFileSync(abs, "utf8").matchAll(/<section[^>]*\bid="([^"]+)"/g)].map((m) => m[1])),
  );
  const hrefs = [
    ...navSource().map(([href]) => href),
    ...[...footerSiteList(read("components/Footer.tsx")).matchAll(/<Link\s+href=("[^"]*"|\{`[^`]*`\})/g)].map((m) => m[1]),
  ].map((expr) => expr.replace(/^\{|\}$/g, "").replace(/^["`]|["`]$/g, "").replace("${site.url}", APEX));
  const dead = hrefs.map(homeAnchorId).filter((id): id is string => id !== null && !ids.has(id));
  assert.deepEqual(dead, []);
});

test("built homepage: section ids in the #61 order", { skip: skipWithoutBuild }, () => {
  assert.ok(HAS_BUILD, "CI=true but .next build output is missing");
  const html = withoutScripts(readFileSync(BUILT_HOME, "utf8"));
  const at = SECTION_IDS.map((id) => {
    const hits = html.match(new RegExp(`\\bid="${id}"`, "g"))?.length ?? 0;
    assert.equal(hits, 1, `built homepage has ${hits} id="${id}"`);
    return html.indexOf(`id="${id}"`);
  });
  const sorted = [...SECTION_IDS].sort((a, b) => at[SECTION_IDS.indexOf(a)] - at[SECTION_IDS.indexOf(b)]);
  assert.deepEqual(sorted, SECTION_IDS);
});

test('built homepage: eyebrow "Industry fit", no "Where it fits"', { skip: skipWithoutBuild }, () => {
  assert.ok(HAS_BUILD, "CI=true but .next build output is missing");
  const html = withoutScripts(readFileSync(BUILT_HOME, "utf8"));
  const section = html.slice(html.indexOf('id="use-cases"'));
  assert.match(section, /<p class="[^"]*">Industry fit<\/p>/, 'built UseCases eyebrow is not "Industry fit"');
  assert.ok(!readFileSync(BUILT_HOME, "utf8").includes("Where it fits"), 'built homepage still reads "Where it fits"');
});

test("built homepage: header tabs and footer anchors, labels and order", { skip: skipWithoutBuild }, () => {
  assert.ok(HAS_BUILD, "CI=true but .next build output is missing");
  const html = readFileSync(BUILT_HOME, "utf8");
  const header = anchors(block(html, "header"))
    .filter((link) => homeAnchorId(link.href) !== null)
    .map((link) => [link.href, link.text]);
  assert.deepEqual(header, NAV_BUILT.map(([href, label]) => [href, label]));
  const footer = anchors(footerSiteList(block(html, "footer"))).map((link) => [link.href, link.text]);
  assert.deepEqual(footer, FOOTER_BUILT.map(([href, label]) => [href, label]));
});

test("built pages: every header and footer homepage anchor resolves to an id on the homepage", { skip: skipWithoutBuild }, () => {
  assert.ok(HAS_BUILD, "CI=true but .next build output is missing");
  const home = withoutScripts(readFileSync(BUILT_HOME, "utf8"));
  const ids = new Set([...home.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
  const problems: string[] = [];
  const pages = filesUnder(BUILT).filter((abs) => abs.endsWith(".html") && !abs.endsWith("_global-error.html"));
  assert.ok(pages.length > 0, "no built pages");
  for (const abs of pages) {
    const html = readFileSync(abs, "utf8");
    for (const tag of ["header", "footer"] as const) {
      if (!html.includes(`<${tag}`)) continue;
      for (const link of anchors(block(html, tag))) {
        const id = homeAnchorId(link.href);
        if (id !== null && !ids.has(id)) problems.push(`${relative(BUILT, abs)} ${tag} ${link.text} -> #${id}`);
      }
    }
  }
  assert.deepEqual(problems, []);
});
