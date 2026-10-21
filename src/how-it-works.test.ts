import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

// /how-it-works is Zak-approved copy (via Marketing, 2026-10-21 9:25 AM CT).
// The copy and the diagram ship verbatim: no rewording, no re-encoding.

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PAGE = join(ROOT, "app", "how-it-works", "page.tsx");
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

test("how-it-works page carries the approved copy verbatim", () => {
  const src = pageSource();
  for (const text of [...HEADINGS, BODY, ALT]) {
    assert.ok(src.includes(text), `missing verbatim: ${text}`);
  }
  for (const [term, description] of LEGEND) {
    assert.ok(src.includes(term), `missing legend term: ${term}`);
    assert.ok(src.includes(description), `missing legend description: ${description}`);
  }
  assert.ok(src.includes(DIAGRAM_PUBLIC_PATH), "page does not reference the served diagram path");
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
