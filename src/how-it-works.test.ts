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
// Dropped from the site entirely by President's call (c) on PR #37.
const DROPPED = [
  "Your perimeter. Your keys. Our agents.",
  "The Fields harness runs inside an environment you control. Retrieval and tool calls happen on your side. Prompts reach Fields inference over TLS, and we don’t log prompts or responses. We design for residency, auditability and a human in the loop, not for pouring NPI into a public model vendor’s cloud.",
];
const SCAN_DIRS = ["app", "components", "content", "lib"];
const collapse = (text: string): string => text.replace(/\s+/g, " ");

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
  "The engine temporarily holds your conversation in RAM, answers, and forgets. Fields Intelligence never writes your prompts or answers to disk, and doesn't log them.";

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
  ["Amnesiac", "the engine temporarily holds your conversation in RAM and never writes it to disk."],
  ["Prompts and responses not logged", "Fields Intelligence keeps no record of what you asked or what it said."],
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
  assert.ok(
    src.includes('title: "How it works"'),
    'page title should be "How it works" so the template reads "How it works · Fields Intelligence"',
  );
  assert.ok(!src.includes("How it works | Fields Intelligence"), "fixed pipe title is still there");
  assert.ok(!src.includes("absolute:"), "how-it-works must use the title template, not a fixed absolute title");
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

test("old section heading, eyebrow and paragraph are gone from the source", () => {
  for (const file of SCAN_DIRS.flatMap((dir) => filesUnder(join(ROOT, dir)))) {
    const text = collapse(readFileSync(file, "utf8"));
    for (const dropped of DROPPED) {
      assert.ok(!text.includes(dropped), `${file} still contains: ${dropped}`);
    }
  }
});

test('/how-it-works has no id="sovereign" (only the homepage teaser keeps it)', () => {
  assert.ok(!pageSource().includes('id="sovereign"'), 'page carries id="sovereign"');
});

// Runs after `npm run build`. CI workflows build before `npm test`, so under
// CI=true missing build output FAILS this test instead of skipping it (Gray
// Beard, PR #37): a workflow edit can't silently drop the check. Locally,
// without a build, it skips.
const BUILT = join(ROOT, ".next", "server", "app");
const HAS_BUILD = existsSync(join(BUILT, "index.html")) && existsSync(join(BUILT, "how-it-works.html"));
const IN_CI = process.env.CI === "true";
test(
  "built HTML: one #sovereign on /, none on /how-it-works, dropped copy absent",
  { skip: !HAS_BUILD && !IN_CI && "no .next build output (run `npm run build` first)" },
  () => {
    assert.ok(HAS_BUILD, "CI=true but .next build output is missing: run `npm run build` before `npm test`");
    const home = readFileSync(join(BUILT, "index.html"), "utf8");
    const page = readFileSync(join(BUILT, "how-it-works.html"), "utf8");
    assert.equal(home.match(/id="sovereign"/g)?.length ?? 0, 1);
    assert.equal(page.match(/id="sovereign"/g)?.length ?? 0, 0);
    for (const html of [home, page]) {
      const text = collapse(html.replace(/&#x27;/g, "'"));
      for (const dropped of DROPPED) assert.ok(!text.includes(dropped), `built HTML contains: ${dropped}`);
    }
  },
);
