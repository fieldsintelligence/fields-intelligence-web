import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

// Ship call (Zak, 10:04 AM CT, via President): the homepage "How it works"
// section (#sovereign) becomes a short teaser for /how-it-works, and the
// text-box trust diagram (components/TrustBoundary.tsx) moves, unchanged, to
// /how-it-works below Zak's architecture diagram. Teaser copy is verbatim
// from Marketing.

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path: string): string => readFileSync(join(ROOT, path), "utf8");

const HOME = "app/page.tsx";
const TEASER = "components/HowItWorksTeaser.tsx";
const HOW_IT_WORKS = "app/how-it-works/page.tsx";
const TRUST_BOUNDARY = "components/TrustBoundary.tsx";

const HEADING = "How it works";
const BODY =
  "Your files, your tools and the Fields Intelligence app run on your own systems. Only your question and the context it needs travel to our AI engine, encrypted both ways. The engine works in memory and never logs your prompts or answers.";
const LINK_TEXT = "See how it works →";
const DIAGRAM_SRC = "/assets/architecture-ribbons-reviewed.png";
const DIAGRAM_ALT =
  "Fields Intelligence architecture: the FI Harness, context store, AgentGateway and harness tools run on your computer inside your organization's access controls, and connect over TLS with SSO and 2FA to the Fields Intelligence AI engine at ai.fieldsintelligence.com.";
const DIAGRAM_SHA256 = "e40dce7277ea8cae176f06b0964586a0afa4405e3326aaa39c4c433cdfbf0c6c";
// sha256 of components/TrustBoundary.tsx at aac35a8: the component moves, it is not edited.
const TRUST_BOUNDARY_SHA256 = "1dde3a9398bc93646e8321bb302c677b0e7f409a97204a52114bf036367f3548";

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

test("teaser is heading, verbatim body, linked thumbnail, then the link, in that order", () => {
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
  const imgAt = at("<img");
  const srcAt = at("src={ARCHITECTURE_DIAGRAM_SRC}");
  const altAt = at("alt={ARCHITECTURE_DIAGRAM_ALT}");
  const linkAt = at(LINK_TEXT);
  assert.ok(headingAt < bodyAt, "body must follow the heading");
  assert.ok(bodyAt < imgAt, "thumbnail must follow the body");
  assert.ok(imgAt < srcAt && srcAt < linkAt && altAt < linkAt, "link must follow the thumbnail");

  // The thumbnail itself links to /how-it-works.
  const openBefore = src.lastIndexOf("<Link", imgAt);
  assert.ok(openBefore >= 0 && src.indexOf("</Link>", openBefore) > imgAt, "thumbnail is not wrapped in a Link");
  assert.match(src.slice(openBefore, src.indexOf(">", openBefore)), /href="\/how-it-works"/, "thumbnail link must go to /how-it-works");
  assert.ok(src.lastIndexOf("</Link>", imgAt) < openBefore, "thumbnail Link is not the nearest open Link");

  // The text link goes to /how-it-works.
  const linkOpen = src.lastIndexOf("<Link", linkAt);
  assert.ok(linkOpen > imgAt, "the text link must be its own Link after the thumbnail");
  assert.match(src.slice(linkOpen, linkAt), /href="\/how-it-works"/, "text link must go to /how-it-works");
  assert.ok(src.indexOf("</Link>", linkAt) > linkAt, "text link is not closed");

  // Plain <img>: approved dimensions, lazy, constrained width.
  assert.ok(
    src.includes("width={ARCHITECTURE_DIAGRAM_WIDTH}") && src.includes("height={ARCHITECTURE_DIAGRAM_HEIGHT}"),
    "thumbnail must carry the shared width and height",
  );
  const img = src.slice(imgAt, src.indexOf("/>", imgAt));
  assert.match(img, /loading="lazy"/, "thumbnail must lazy-load");
  assert.match(img, /\bmax-w-full\b/, "thumbnail must have max-width: 100%");
  assert.match(src, /<figure className="[^"]*\bmax-w-(xs|sm|md|lg|xl|2xl|3xl)\b/, "thumbnail must have a constrained max width");
  assert.ok(!src.includes("next/image"), "thumbnail must be a plain <img>, not next/image");
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

test("trust diagram component is reused unchanged", () => {
  const hash = createHash("sha256").update(readFileSync(join(ROOT, TRUST_BOUNDARY))).digest("hex");
  assert.equal(hash, TRUST_BOUNDARY_SHA256);
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
