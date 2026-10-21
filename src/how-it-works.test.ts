import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

// /how-it-works is Zak-approved copy (via Marketing, 2026-10-21 9:25 AM CT).
// The copy and the diagram ship verbatim: no rewording, no re-encoding.

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PAGE = join(ROOT, "app", "how-it-works", "page.tsx");
// The diagram src and alt are shared with the homepage teaser (Gray Beard spec, 2026-10-21).
const DIAGRAM_MODULE = join(ROOT, "lib", "architecture-diagram.ts");
const TRUST_BOUNDARY = join(ROOT, "components", "TrustBoundary.tsx");
// President's call (c) on PR #37, 2026-10-21: only the inside/outside box and
// the four pillars move here, unchanged. sha256 of their markup and copy
// (pillars array + box/pillars JSX, whitespace collapsed) as it was at aac35a8.
const BOX_AND_PILLARS_SHA256 = "ad3a83236d2f801264f6895f57d11114ed8225e9f92aeae1610d46bf5527ac44";
// Dropped from the site entirely by the same call.
const DROPPED = [
  "Your perimeter. Your keys. Our agents.",
  "The Fields harness runs inside an environment you control. Retrieval and tool calls happen on your side. Prompts reach Fields inference over TLS, and we don’t log prompts or responses. We design for residency, auditability and a human in the loop, not for pouring NPI into a public model vendor’s cloud.",
];
const SCAN_DIRS = ["app", "components", "content", "lib"];
const collapse = (text: string): string => text.replace(/\s+/g, " ");

/** Box + pillars markup and copy, whitespace collapsed (see BOX_AND_PILLARS_SHA256). */
function boxAndPillars(src: string): string {
  const pillarsStart = src.indexOf("const pillars = [");
  const boxStart = src.indexOf('<div className="mt-12 overflow-hidden');
  assert.ok(pillarsStart >= 0, "pillars array missing");
  assert.ok(boxStart >= 0, "inside/outside box missing");
  const pillars = src.slice(pillarsStart, src.indexOf("];", pillarsStart) + 2);
  const boxEnd = src.indexOf("</div>", src.lastIndexOf("))}")) + "</div>".length;
  return `${collapse(pillars).trim()}\n${collapse(src.slice(boxStart, boxEnd)).trim()}`;
}

function filesUnder(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? filesUnder(join(dir, entry.name)) : [join(dir, entry.name)],
  );
}
const DIAGRAM_PUBLIC_PATH = "/assets/architecture-ribbons-reviewed.png";
const DIAGRAM = join(ROOT, "public", DIAGRAM_PUBLIC_PATH);
// sha256 of /workspace/fields-brand/architecture-ribbons-reviewed.png as Marketing handed it over.
const DIAGRAM_SHA256 = "e40dce7277ea8cae176f06b0964586a0afa4405e3326aaa39c4c433cdfbf0c6c";

const HEADINGS = ["Your data stays under your control.", "What you're looking at"];

const BODY =
  "Your files, your tools and the Fields Intelligence app all run on your own computers, behind your own sign-in rules. When you ask a question, only that question and the bits of your files needed to answer it travel to our AI engine, encrypted both ways. The engine works in memory, answers, and forgets. We never write your prompts or answers to disk, and we don't log them.";

const ALT =
  "Fields Intelligence architecture: the FI Harness, context store, AgentGateway and harness tools run on your computer inside your organization's access controls, and connect over TLS with SSO and 2FA to the Fields Intelligence AI engine at ai.fieldsintelligence.com.";

const LEGEND: ReadonlyArray<readonly [string, string]> = [
  ["Your computer", "the computer you already use at work."],
  ["FI Harness", "the Fields Intelligence app that does the work for you. It runs on your systems, not ours."],
  ["Context store", "the files and notes the app is allowed to read. They're stored on your infrastructure."],
  ["AgentGateway", "the gatekeeper. Before any tool runs, it checks whether your role allows it."],
  ["Harness tools", "what the app can use to get work done: internet access (only as your policy allows), your databases, and everyday software utilities."],
  ["Audit and compliance logging", "a record of every action the app takes, kept on your systems for your examiners and auditors."],
  ["Acts only with the signed-in user's permissions", "the app can't do anything you aren't already allowed to do."],
  ["Organizational access controls (dashed line)", "your company's existing permission rules surround all of it."],
  ["SSO sign-in with 2FA", "you sign in with your work account plus a second check, like a code or security key."],
  ["TLS padlock", "the connection to our engine is encrypted in both directions."],
  ["Prompt / context (red arrow)", "your question, plus the pieces of your files needed to answer it."],
  ["Response / action (blue arrow)", "the answer, or a request to use a tool. The app carries out that request on your side, only after the gatekeeper checks it."],
  ["AI engine (LLM)", "the \"brain\" that reads your request and writes the answer. It runs on Fields Intelligence servers at ai.fieldsintelligence.com."],
  ["Amnesiac", "the engine holds your conversation in memory only and never writes it to disk."],
  ["Prompts and responses not logged", "we keep no record of what you asked or what it said."],
  ["No open-internet connectivity", "the engine can't reach out to the web on its own."],
];

function pageSource(): string {
  assert.ok(existsSync(PAGE), "app/how-it-works/page.tsx is missing");
  return readFileSync(PAGE, "utf8");
}

function diagramModuleSource(): string {
  assert.ok(existsSync(DIAGRAM_MODULE), "lib/architecture-diagram.ts is missing");
  return readFileSync(DIAGRAM_MODULE, "utf8");
}

test("how-it-works page carries the approved copy verbatim", () => {
  const src = pageSource();
  for (const text of [...HEADINGS, BODY]) {
    assert.ok(src.includes(text), `missing verbatim: ${text}`);
  }
  // The alt text and src live in the shared module and the page renders them.
  const shared = diagramModuleSource();
  assert.ok(shared.includes(JSON.stringify(ALT)), `missing verbatim alt in lib/architecture-diagram.ts: ${ALT}`);
  assert.ok(shared.includes(JSON.stringify(DIAGRAM_PUBLIC_PATH)), "shared module does not reference the served diagram path");
  assert.match(src, /from "@\/lib\/architecture-diagram"/, "page does not import the shared diagram module");
  assert.ok(src.includes("alt={DIAGRAM_ALT}") && src.includes("const DIAGRAM_ALT = ARCHITECTURE_DIAGRAM_ALT;"), "page img does not use the shared alt");
  for (const [term, description] of LEGEND) {
    assert.ok(src.includes(term), `missing legend term: ${term}`);
    assert.ok(src.includes(description), `missing legend description: ${description}`);
  }
  assert.ok(src.includes("const DIAGRAM_SRC = ARCHITECTURE_DIAGRAM_SRC;") && src.includes("src={DIAGRAM_SRC}"), "page img does not use the shared diagram path");
  assert.ok(!/["']use client["']/.test(src), "page must stay static (no 'use client')");
});

test("how-it-works metadata uses the full company name", () => {
  const src = pageSource();
  assert.ok(src.includes("How it works | Fields Intelligence"), "missing page title");
  assert.ok(
    src.includes("Your files, your tools and the Fields Intelligence app all run on your own computers, behind your own sign-in rules."),
    "description is not the body's first sentence",
  );
});

test("served diagram is byte-identical to the approved file", () => {
  assert.ok(existsSync(DIAGRAM), `public${DIAGRAM_PUBLIC_PATH} is missing`);
  const hash = createHash("sha256").update(readFileSync(DIAGRAM)).digest("hex");
  assert.equal(hash, DIAGRAM_SHA256);
});

test("footer links to /how-it-works exactly once", () => {
  const footer = readFileSync(join(ROOT, "components", "Footer.tsx"), "utf8");
  assert.equal(footer.match(/href="\/how-it-works"/g)?.length ?? 0, 1);
  assert.ok(footer.includes("How it works"), "footer link label missing");
});

test("sitemap lists /how-it-works", () => {
  const sitemap = readFileSync(join(ROOT, "app", "sitemap.ts"), "utf8");
  assert.ok(sitemap.includes("/how-it-works"), "sitemap does not list /how-it-works");
});

test("how-it-works renders the text-box trust diagram below the architecture figure", () => {
  const src = pageSource();
  assert.match(src, /import \{ TrustBoundary \} from "@\/components\/TrustBoundary"/, "TrustBoundary is not imported");
  assert.equal(src.match(/<TrustBoundary\s*\/>/g)?.length ?? 0, 1, "TrustBoundary must render exactly once");
  const figureEnd = src.indexOf("</figure>");
  const trustAt = src.search(/<TrustBoundary\s*\/>/);
  const legendAt = src.indexOf("{LEGEND_HEADING}");
  assert.ok(figureEnd >= 0 && src.indexOf("src={DIAGRAM_SRC}") < figureEnd, "architecture figure missing");
  assert.ok(figureEnd < trustAt, "trust diagram must come after the architecture figure");
  assert.ok(trustAt < legendAt, "trust diagram must sit directly below the figure, before the legend");
});

test("inside/outside box and the four pillars are unchanged", () => {
  const src = readFileSync(TRUST_BOUNDARY, "utf8");
  const hash = createHash("sha256").update(boxAndPillars(src)).digest("hex");
  assert.equal(hash, BOX_AND_PILLARS_SHA256);
  for (const title of ["Your systems, your harness", "No public-vendor hop for customer files", "Human sign-off", "Tamper-evident audit log"]) {
    assert.ok(src.includes(`title: "${title}"`), `missing pillar: ${title}`);
  }
});

test("old section heading, eyebrow and paragraph are gone from the source", () => {
  for (const file of SCAN_DIRS.flatMap((dir) => filesUnder(join(ROOT, dir)))) {
    const text = collapse(readFileSync(file, "utf8"));
    for (const dropped of DROPPED) {
      assert.ok(!text.includes(dropped), `${file} still contains: ${dropped}`);
    }
  }
  const trust = readFileSync(TRUST_BOUNDARY, "utf8");
  assert.ok(!/<h2\b/.test(trust), "trust diagram must not carry the old section heading");
  assert.ok(!trust.includes(">How it works<"), "trust diagram must not carry the old eyebrow");
});

test('/how-it-works has no id="sovereign" (only the homepage teaser keeps it)', () => {
  assert.ok(!pageSource().includes('id="sovereign"'), 'page carries id="sovereign"');
  assert.ok(!readFileSync(TRUST_BOUNDARY, "utf8").includes('id="sovereign"'), 'trust diagram carries id="sovereign"');
});

// Runs after `npm run build` (skipped when there is no build output, as in CI's test step).
const BUILT = join(ROOT, ".next", "server", "app");
test(
  "built HTML: one #sovereign on /, none on /how-it-works, dropped copy absent, box after the figure",
  { skip: !existsSync(join(BUILT, "index.html")) && "no .next build output" },
  () => {
    const home = readFileSync(join(BUILT, "index.html"), "utf8");
    const page = readFileSync(join(BUILT, "how-it-works.html"), "utf8");
    assert.equal(home.match(/id="sovereign"/g)?.length ?? 0, 1);
    assert.equal(page.match(/id="sovereign"/g)?.length ?? 0, 0);
    for (const html of [home, page]) {
      const text = collapse(html.replace(/&#x27;/g, "'"));
      for (const dropped of DROPPED) assert.ok(!text.includes(dropped), `built HTML contains: ${dropped}`);
    }
    const imgAt = page.indexOf(DIAGRAM_PUBLIC_PATH);
    const boxAt = page.indexOf("Outside your systems");
    const pillarsAt = page.indexOf("Tamper-evident audit log");
    const legendAt = page.indexOf("What you&#x27;re looking at");
    assert.ok(imgAt >= 0 && imgAt < boxAt && boxAt < pillarsAt && pillarsAt < legendAt, "order must be figure, box, pillars, legend");
  },
);
