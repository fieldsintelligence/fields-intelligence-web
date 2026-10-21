import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

// The homepage "How it works" section (#sovereign) is a short teaser for
// /how-it-works (PR #37). Teaser copy is verbatim from Marketing. Only the
// inside/outside box and four pillars (components/TrustBoundary.tsx) live on
// /how-it-works (see how-it-works.test.ts). The two-column layout and the
// "Take a deeper look" link text (PR #42) are pinned by the tests below.

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path: string): string => readFileSync(join(ROOT, path), "utf8");

const HOME = "app/page.tsx";
const TEASER = "components/HowItWorksTeaser.tsx";
const HOW_IT_WORKS = "app/how-it-works/page.tsx";
const TRUST_BOUNDARY = "components/TrustBoundary.tsx";

const HEADING = "How it works";
const BODY =
  "Your files, your tools and the Fields Intelligence app run on your own systems. Only your question and the context it needs travel to our AI engine, encrypted both ways. The engine works in memory and never logs your prompts or answers.";
const LINK_TEXT = "Take a deeper look →";
const OLD_LINK_TEXT = "See how it works →";
const HERO_BUTTON_TEXT = "See how it works";
const DIAGRAM_SRC = "/assets/architecture-ribbons-reviewed.png";
const DIAGRAM_ALT =
  "Fields Intelligence architecture: the FI Harness, context store, AgentGateway and harness tools run on your computer inside your organization's access controls, and connect over TLS with SSO and 2FA to the Fields Intelligence AI engine at ai.fieldsintelligence.com.";
const DIAGRAM_SHA256 = "e40dce7277ea8cae176f06b0964586a0afa4405e3326aaa39c4c433cdfbf0c6c";

/** Components rendered by the homepage, from its `@/components/*` imports. */
function homeComponents(): string[] {
  const src = read(HOME);
  return [...src.matchAll(/import\s*\{\s*(\w+)\s*\}\s*from\s*"@\/components\/(\w+)"/g)]
    .filter(([, name]) => new RegExp(`<${name}\\s*/>`).test(src))
    .map(([, , file]) => `components/${file}.tsx`);
}

function stripComments(src: string): string {
  return src.replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

test("homepage renders the teaser and not the trust diagram", () => {
  const files = homeComponents();
  assert.ok(files.includes(TEASER), `${HOME} does not render ${TEASER}`);
  assert.ok(!files.includes(TRUST_BOUNDARY), `${HOME} still renders ${TRUST_BOUNDARY}`);
  assert.ok(!read(HOME).includes("TrustBoundary"), `${HOME} still references TrustBoundary`);
  const sovereign = files.filter((file) => /id="sovereign"/.test(read(file)));
  assert.deepEqual(sovereign, [TEASER], 'exactly one homepage section must carry id="sovereign": the teaser');
});

test("teaser keeps the #sovereign anchor that the hero and footer link to", () => {
  assert.ok(read("components/Hero.tsx").includes('href="/#sovereign"'), "hero link changed");
  assert.ok(read("components/Footer.tsx").includes('href="/#sovereign"'), "footer link changed");
});

test("teaser is heading, verbatim body, the link, then the linked thumbnail, in that order", () => {
  assert.ok(existsSync(join(ROOT, TEASER)), `${TEASER} is missing`);
  const src = stripComments(read(TEASER));
  assert.equal(src.match(/<h2\b/g)?.length ?? 0, 1, "teaser needs exactly one h2");
  const heading = src.match(/<h2\b[^>]*>\s*([^<]*?)\s*<\/h2>/)?.[1];
  assert.equal(heading, HEADING, "teaser heading is not verbatim");

  const at = (needle: string): number => {
    const index = src.indexOf(needle);
    assert.ok(index >= 0, `teaser is missing: ${needle}`);
    return index;
  };
  const headingAt = src.search(/<h2\b/);
  const bodyAt = at(BODY);
  const linkAt = at(LINK_TEXT);
  const imgAt = at("<img");
  const srcAt = at("src={ARCHITECTURE_DIAGRAM_SRC}");
  const altAt = at("alt={ARCHITECTURE_DIAGRAM_ALT}");
  assert.ok(headingAt < bodyAt, "body must follow the heading");
  assert.ok(bodyAt < linkAt, "link must follow the body");
  assert.ok(linkAt < imgAt && imgAt < srcAt && imgAt < altAt, "thumbnail must follow the link");

  // The text link is exactly LINK_TEXT and goes to /how-it-works.
  const linkOpen = src.lastIndexOf("<Link", linkAt);
  assert.ok(linkOpen > bodyAt, "the text link must be its own Link after the body");
  const linkTag = src.slice(linkOpen, src.indexOf(">", linkOpen) + 1);
  assert.match(linkTag, /href="\/how-it-works"/, "text link must go to /how-it-works");
  const linkClose = src.indexOf("</Link>", linkAt);
  assert.ok(linkClose > linkAt, "text link is not closed");
  assert.equal(src.slice(linkOpen + linkTag.length, linkClose).trim(), LINK_TEXT, "text link text must be exactly the new wording");

  // The thumbnail itself links to /how-it-works.
  const openBefore = src.lastIndexOf("<Link", imgAt);
  assert.ok(openBefore > linkClose, "thumbnail must have its own Link after the text link");
  assert.ok(src.indexOf("</Link>", openBefore) > imgAt, "thumbnail is not wrapped in a Link");
  assert.match(src.slice(openBefore, src.indexOf(">", openBefore)), /href="\/how-it-works"/, "thumbnail link must go to /how-it-works");
  assert.ok(src.lastIndexOf("</Link>", imgAt) < openBefore, "thumbnail Link is not the nearest open Link");

  // Plain <img>: approved dimensions, lazy, constrained width, no layout shift.
  assert.ok(
    src.includes("width={ARCHITECTURE_DIAGRAM_WIDTH}") && src.includes("height={ARCHITECTURE_DIAGRAM_HEIGHT}"),
    "thumbnail must carry the shared width and height",
  );
  const img = src.slice(imgAt, src.indexOf("/>", imgAt));
  assert.match(img, /loading="lazy"/, "thumbnail must lazy-load");
  const imgClass = img.match(/className="([^"]*)"/)?.[1] ?? "";
  assert.match(imgClass, /(^|\s)max-w-full(\s|$)/, "thumbnail must have max-width: 100% (max-w-full)");
  assert.match(imgClass, /(^|\s)h-auto(\s|$)/, "thumbnail must have height: auto (h-auto)");
  assert.match(src, /<figure className="[^"]*\bmax-w-(xs|sm|md|lg|xl|2xl|3xl)\b/, "thumbnail must have a constrained max width");
  assert.ok(!src.includes("next/image"), "thumbnail must be a plain <img>, not next/image");
});

test("two-column teaser: CSS grid, two columns at lg and up, one column below, text first", () => {
  const src = stripComments(read(TEASER));
  assert.ok(!/\bstyle=\{/.test(src), "teaser must not use inline styles");
  const gridAt = src.search(/className="[^"]*(^|\s|")grid(\s|")/);
  assert.ok(gridAt >= 0, "teaser needs a CSS grid container");
  const gridClass = src.slice(gridAt).match(/className="([^"]*)"/)?.[1] ?? "";
  assert.match(gridClass, /(^|\s)grid(\s|$)/, "container must be display: grid");
  assert.match(gridClass, /(^|\s)lg:grid-cols-2(\s|$)/, "two columns at the existing lg breakpoint and up");
  assert.ok(!/(^|\s)(sm:|md:|xl:|2xl:)?grid-cols-/.test(gridClass.replace(/(^|\s)lg:grid-cols-2(?=\s|$)/, " ")),
    "only the lg breakpoint may set grid columns (one column below it)");
  assert.ok(!/(\s|")([a-z0-9]+:)?-?order-(first|last|none|\d|\[)/.test(src),
    "no order-* utilities: DOM order (text first) is the visual order");
  // Text column (heading, body, link) precedes the image column, both inside the grid.
  const textCol = src.indexOf("<div", gridAt + 1);
  const h2At = src.search(/<h2\b/);
  const figureAt = src.indexOf("<figure");
  assert.ok(gridAt < textCol && textCol < h2At, "heading must sit in the first grid column");
  assert.ok(src.indexOf("</div>", textCol) > src.indexOf(LINK_TEXT), "link must sit in the text column");
  assert.ok(src.indexOf("</div>", textCol) < figureAt, "image must sit in the second grid column, after the text column");
  // No new CSS dependency: no new breakpoint tokens or stylesheet imports.
  assert.ok(!/--breakpoint-/.test(read("app/globals.css")), "no new breakpoint token in globals.css");
  assert.ok(!/import\s+["'][^"']+\.css["']/.test(read(TEASER)), "teaser must not import CSS");
});

/** All .ts/.tsx files under app/ and components/. */
function siteFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const name of readdirSync(join(ROOT, dir))) {
      const rel = `${dir}/${name}`;
      if (statSync(join(ROOT, rel)).isDirectory()) walk(rel);
      else if (/\.(ts|tsx)$/.test(name)) out.push(rel);
    }
  };
  walk("app");
  walk("components");
  return out;
}

test("old teaser link text is gone from app/ and components/", () => {
  const hits = siteFiles().filter((file) => read(file).includes(OLD_LINK_TEXT));
  assert.deepEqual(hits, [], `"${OLD_LINK_TEXT}" must not appear`);
});

test("hero button \"See how it works\" is unchanged", () => {
  const hero = read("components/Hero.tsx");
  const buttons = [...hero.matchAll(/<Link\s+href="\/#sovereign"[^>]*>\s*([^<]*?)\s*<\/Link>/g)].map((m) => m[1]);
  assert.deepEqual(buttons, [HERO_BUTTON_TEXT], "hero must keep exactly one #sovereign button reading \"See how it works\"");
});

test('exactly one id="sovereign" site-wide, on the teaser', () => {
  const hits = siteFiles().flatMap((file) => (read(file).match(/id="sovereign"/g) ?? []).map(() => file));
  assert.deepEqual(hits, [TEASER]);
});

test("teaser and /how-it-works share one alt constant (no duplicated alt string)", () => {
  const shared = read("lib/architecture-diagram.ts");
  assert.ok(shared.includes(`export const ARCHITECTURE_DIAGRAM_ALT =\n  ${JSON.stringify(DIAGRAM_ALT)};`), "shared alt is not the approved wording");
  assert.ok(shared.includes(`export const ARCHITECTURE_DIAGRAM_SRC = ${JSON.stringify(DIAGRAM_SRC)};`), "shared src changed");
  assert.match(shared, /ARCHITECTURE_DIAGRAM_WIDTH = 2400;/);
  assert.match(shared, /ARCHITECTURE_DIAGRAM_HEIGHT = 1349;/);
  for (const file of [TEASER, HOW_IT_WORKS]) {
    const src = read(file);
    assert.match(src, /from "@\/lib\/architecture-diagram"/, `${file} does not import the shared constants`);
    assert.ok(!src.includes(DIAGRAM_ALT), `${file} duplicates the alt string`);
  }
});

test("/how-it-works renders the trust diagram after the architecture diagram, before the legend", () => {
  const src = read(HOW_IT_WORKS);
  assert.match(src, /import\s*\{\s*TrustBoundary\s*\}\s*from\s*"@\/components\/TrustBoundary"/, "TrustBoundary is not imported");
  const usages = src.match(/<TrustBoundary\s*\/>/g)?.length ?? 0;
  assert.equal(usages, 1, "TrustBoundary must render exactly once");
  const imgAt = src.indexOf("src={DIAGRAM_SRC}");
  const trustAt = src.search(/<TrustBoundary\s*\/>/);
  const legendAt = src.indexOf("{LEGEND_HEADING}");
  assert.ok(imgAt >= 0 && legendAt >= 0, "architecture img or legend missing");
  assert.ok(imgAt < trustAt, "trust diagram must come after the architecture diagram");
  assert.ok(trustAt < legendAt, "trust diagram must sit directly below the figure, before the legend");
});

test("trust diagram no longer carries the #sovereign anchor", () => {
  assert.ok(!read(TRUST_BOUNDARY).includes('id="sovereign"'), "only the homepage teaser keeps id=\"sovereign\"");
});

test("architecture PNG is unchanged", () => {
  const hash = createHash("sha256").update(readFileSync(join(ROOT, "public", DIAGRAM_SRC))).digest("hex");
  assert.equal(hash, DIAGRAM_SHA256);
});

test('header nav "How it works" is /how-it-works', () => {
  const items = [...read("lib/site.ts").matchAll(/\{\s*href:\s*"([^"]*)",\s*label:\s*"How it works"\s*\}/g)];
  assert.equal(items.length, 1);
  assert.equal(items[0]?.[1], "/how-it-works");
});
