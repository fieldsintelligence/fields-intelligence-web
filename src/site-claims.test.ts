import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

/**
 * Site-claims guard for #29.
 *
 * Patterns are the r4 guard list (issue comment 6317042723), which replaces
 * the list in 6316958185. Where those comments differ, r4 wins. The #28
 * audit-log ban, the never-stored ban, and the planned/roadmap exception
 * are not part of this guard.
 *
 * Order of operations, kept by 6316958185: strip code comments, strip tags,
 * collapse whitespace, split sentences, then match. Patterns are
 * case-insensitive. Comments are stripped only in .ts/.tsx (`//` and block
 * comments), which is what clears lib/site.ts.
 *
 * File scope, including README.md and public text files: app/, components/,
 * content/, lib/, README.md, and in public/ only .txt, .html, .json, .xml,
 * .svg, and .webmanifest.
 */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const SCOPE_DIRS = ["app", "components", "content", "lib"];
const SCOPE_EXT = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".md",
  ".mdx",
  ".txt",
  ".html",
  ".json",
  ".xml",
  ".svg",
  ".css",
  ".webmanifest",
]);
const PUBLIC_EXT = new Set([
  ".txt",
  ".html",
  ".json",
  ".xml",
  ".svg",
  ".webmanifest",
]);

// r4 kept patterns, R-2, immutable / tamper-proof, and the named bans.
const PATTERNS: { rule: string; re: RegExp }[] = [
  {
    rule: "N-1",
    re: /\b(data|prompts?|outputs?|models?|PHI|NPI|work product|claim data)\b[^.]{0,30}\bstays?\b[^.]{0,10}\b(here|in(side)? your|on your)/i,
  },
  {
    rule: "never-resides",
    re: /never resides anywhere except/i,
  },
  {
    rule: "walls",
    re: /(firm|bank)['’]?s? wall/i,
  },
  {
    rule: "public-internet",
    re: /\b(no|not|never|without)\b[^.]{0,40}public internet/i,
  },
  {
    rule: "model-run-local",
    re: /model run\s*·\s*local/i,
  },
  {
    rule: "egress",
    re: /egress[^.]{0,20}(none|0)\b/i,
  },
  {
    rule: "encrypted-in-out",
    re: /encrypted in, encrypted out/i,
  },
  {
    rule: "R-2",
    re: /\b(data|prompts?|files?|outputs?|models?|PHI|NPI|work product|claim data)\b[^.]{0,30}\bnever (leaves?|leave|resides?)\b/i,
  },
  {
    rule: "immutable",
    re: /\bimmutable\b/i,
  },
  {
    rule: "tamper-proof",
    re: /tamper[- ]?proof/i,
  },
  {
    rule: "read-inferred-approved",
    re: /what was read, inferred, and approved/i,
  },
  {
    rule: "exam-ready-trails",
    re: /exam-ready trails/i,
  },
];

const REGULATOR =
  /(FDIC|FFIEC|OCC|NCUA|GLBA|regulat\w*)[^.]{0,60}requir/i;
const RETENTION = /12 months|retention|retain|kept/i;

/** 6316958185 logging and retention text, kept by r4. */
const APPROVED_LOGGING_AND_RETENTION =
  "We do not log prompts or responses. We keep usage records: the time, request path, status, response time, organization, user ID and access scope of each request, plus sign-in and error records with IP address and browser. Usage metadata (user ID, IP address, request path; never prompt or response content) is kept for 12 months for security and incident investigation, then deleted, unless a specific incident or legal hold requires longer.";

/** r4 R-1 exact strings. "…" in the Products line is the spec's ellipsis. */
const EXACT = {
  trustTitle: "Tamper-evident audit log",
  trustBody:
    "Every harness tool call is recorded on your systems: time, user, tool, decision and result. No prompt or file content unless you turn it on. You set retention and export.",
  reviewer: "Reviewer + log",
  signOffHash: "Sign-off, then a hash",
  reviewerCombined: "Reviewer + log / Sign-off, then a hash",
  productsLead: "Sensitive-file review for exam prep.",
  productsLog:
    "Every pass is recorded in a tamper-evident audit log on your systems.",
  products:
    "Sensitive-file review for exam prep. \u2026 Every pass is recorded in a tamper-evident audit log on your systems.",
  useCases: "Audit log \u00b7 on your systems",
  demoTitle: "Audit log (demo)",
  proof: "The log stays behind.",
  readme: "a tamper-evident audit log on your systems",
  commit: "Commit to audit log",
  written: "Written to the log",
  inBank: "Review committed to the in-bank log",
  logStays: "the log stays",
  logHash: "log hash",
  auditRow: "Tool call \u00b7 file.open \u00b7 allow \u00b7 J. Hale \u00b7 ok",
} as const;

type Hit = { file: string; line: number; rule: string; text: string };

type Frame = { kind: "code" | "str"; q: string; brace: number | null };

function stripCodeComments(source: string): string {
  let result = "";
  let i = 0;
  const n = source.length;
  const stack: Frame[] = [];
  let kind: "code" | "str" | "line" | "block" = "code";
  let q = "";
  let brace: number | null = null;

  while (i < n) {
    const c = source[i] ?? "";
    const next = i + 1 < n ? (source[i + 1] ?? "") : "";

    if (kind === "line") {
      if (c === "\n") {
        const prev = stack.pop();
        kind = prev?.kind === "str" ? "str" : "code";
        q = prev?.q ?? "";
        brace = prev?.brace ?? null;
        result += "\n";
      } else {
        result += " ";
      }
      i += 1;
      continue;
    }

    if (kind === "block") {
      if (c === "*" && next === "/") {
        result += "  ";
        i += 2;
        const prev = stack.pop();
        kind = prev?.kind === "str" ? "str" : "code";
        q = prev?.q ?? "";
        brace = prev?.brace ?? null;
        continue;
      }
      result += c === "\n" ? "\n" : " ";
      i += 1;
      continue;
    }

    if (kind === "str") {
      if (c === "\\") {
        result += c;
        i += 1;
        if (i < n) {
          result += source[i];
          i += 1;
        }
        continue;
      }
      if (q === "`" && c === "$" && next === "{") {
        result += "${";
        i += 2;
        stack.push({ kind: "str", q, brace });
        kind = "code";
        q = "";
        brace = 1;
        continue;
      }
      result += c;
      i += 1;
      if (c === q) kind = "code";
      continue;
    }

    if (c === "/" && next === "/") {
      stack.push({ kind: "code", q: "", brace });
      kind = "line";
      result += " ";
      i += 1;
      continue;
    }
    if (c === "/" && next === "*") {
      stack.push({ kind: "code", q: "", brace });
      kind = "block";
      result += " ";
      i += 1;
      continue;
    }
    if (c === "'" || c === '"' || c === "`") {
      kind = "str";
      q = c;
      result += c;
      i += 1;
      continue;
    }
    if (brace !== null) {
      if (c === "{") brace += 1;
      else if (c === "}") {
        brace -= 1;
        if (brace === 0) {
          const prev = stack.pop();
          kind = prev?.kind === "str" ? "str" : "code";
          q = prev?.q ?? "";
          brace = prev?.brace ?? null;
        }
      }
    }
    result += c;
    i += 1;
  }

  if (result.length !== source.length) {
    throw new Error(
      `comment strip changed length (${result.length} != ${source.length})`,
    );
  }
  return result;
}

function stripTags(source: string): string {
  return source.replace(/<[A-Za-z/!][^>]*>/g, (tag) =>
    tag.replace(/[^\n]/g, " "),
  );
}

function collapseWhitespace(source: string): { text: string; map: number[] } {
  let text = "";
  const map: number[] = [];
  let i = 0;
  let ws = -1;
  while (i < source.length) {
    if (/\s/.test(source[i] ?? "")) {
      if (ws < 0) ws = i;
      i += 1;
      continue;
    }
    if (ws >= 0 && text.length > 0) {
      text += " ";
      map.push(ws);
    }
    ws = -1;
    text += source[i];
    map.push(i);
    i += 1;
  }
  return { text, map };
}

function lineNumberAt(source: string, index: number): number {
  let line = 1;
  const end = Math.max(0, Math.min(index, source.length));
  for (let i = 0; i < end; i += 1) {
    if (source[i] === "\n") line += 1;
  }
  return line;
}

function sentencesOf(text: string): { text: string; start: number }[] {
  const sentences: { text: string; start: number }[] = [];
  let i = 0;
  while (i < text.length) {
    while (i < text.length && /\s/.test(text[i] ?? "")) i += 1;
    const start = i;
    while (i < text.length && !".!?".includes(text[i] ?? "")) i += 1;
    const raw = text.slice(start, i);
    const trimmed = raw.trim();
    if (trimmed) {
      const lead = raw.length - raw.trimStart().length;
      sentences.push({ text: trimmed, start: start + lead });
    }
    i += 1;
  }
  return sentences;
}

function matchAll(re: RegExp, text: string): RegExpExecArray[] {
  const flags = re.flags.includes("g") ? re.flags : `${re.flags}g`;
  return [...text.matchAll(new RegExp(re.source, flags))];
}

function isTypeScript(file: string): boolean {
  return /\.tsx?$/.test(file);
}

function prepare(file: string, source: string): { text: string; map: number[] } {
  const uncommented = isTypeScript(file) ? stripCodeComments(source) : source;
  return collapseWhitespace(stripTags(uncommented));
}

function check(file: string, source: string): Hit[] {
  const { text, map } = prepare(file, source);
  const hits: Hit[] = [];
  for (const sentence of sentencesOf(text)) {
    for (const pattern of PATTERNS) {
      for (const match of matchAll(pattern.re, sentence.text)) {
        const at = map[sentence.start + (match.index ?? 0)];
        if (at === undefined) continue;
        hits.push({
          file,
          line: lineNumberAt(source, at),
          rule: pattern.rule,
          text: match[0],
        });
      }
    }
    if (REGULATOR.test(sentence.text) && RETENTION.test(sentence.text)) {
      const at = map[sentence.start];
      if (at === undefined) continue;
      hits.push({
        file,
        line: lineNumberAt(source, at),
        rule: "regulatory",
        text: sentence.text,
      });
    }
  }
  hits.sort((a, b) =>
    a.line - b.line || a.rule.localeCompare(b.rule) || a.text.localeCompare(b.text),
  );
  return hits;
}

function formatHit(hit: Hit): string {
  return `${hit.file}:${hit.line}: ${hit.text}`;
}

function expectReject(file: string, sample: string, rule: string): void {
  const hits = check(file, sample).filter((hit) => hit.rule === rule);
  assert.ok(
    hits.length >= 1,
    `expected ${rule} to reject ${JSON.stringify(sample)}`,
  );
  for (const hit of hits) {
    assert.match(formatHit(hit), /^[^:\n]+:\d+: .+/);
    assert.ok(formatHit(hit).includes(hit.text));
  }
}

function expectAllow(sample: string): void {
  const hits = check("sample.txt", sample);
  assert.deepEqual(
    hits.map(formatHit),
    [],
    `expected a pass for ${JSON.stringify(sample)}`,
  );
}

function walk(
  dir: string,
  accept: (abs: string, name: string) => boolean,
  out: string[],
): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".git") continue;
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(abs, accept, out);
    } else if (entry.isFile() && accept(abs, entry.name)) {
      out.push(abs);
    }
  }
}

function scopeFiles(): string[] {
  const files: string[] = [];
  for (const dir of SCOPE_DIRS) {
    const absDir = join(ROOT, dir);
    if (!statSync(absDir).isDirectory()) continue;
    walk(absDir, (_abs, name) => SCOPE_EXT.has(extname(name)), files);
  }
  const readme = join(ROOT, "README.md");
  if (statSync(readme).isFile()) files.push(readme);
  const publicDir = join(ROOT, "public");
  if (statSync(publicDir).isDirectory()) {
    walk(publicDir, (_abs, name) => PUBLIC_EXT.has(extname(name)), files);
  }
  return files.sort();
}

function extname(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot).toLowerCase() : "";
}

function rel(abs: string): string {
  return relative(ROOT, abs).split(sep).join("/");
}

const REPO_HITS: Hit[] = scopeFiles().flatMap((abs) => {
  const file = rel(abs);
  return check(file, readFileSync(abs, "utf8")).map((hit) => ({
    ...hit,
    file,
  }));
});

function assertRuleClean(rule: string): void {
  const hits = REPO_HITS.filter((hit) => hit.rule === rule);
  if (hits.length === 0) return;
  assert.fail(hits.map(formatHit).join("\n"));
}

function readRepo(file: string): string {
  return readFileSync(join(ROOT, file), "utf8");
}

function lineOf(source: string, needle: string): number {
  const at = source.indexOf(needle);
  assert.ok(at >= 0, `needle not in file: ${needle}`);
  return lineNumberAt(source, at);
}

function lineText(source: string, line: number): string {
  return (source.split("\n")[line - 1] ?? "").trim();
}

function assertPublished(
  file: string,
  required: string,
  currentNeedle: string,
): void {
  const source = readRepo(file);
  if (source.includes(required)) return;
  const line = lineOf(source, currentNeedle);
  assert.fail(`${file}:${line}: ${lineText(source, line)}`);
}

test('r4 must fail: "Your prompts never leave your machine."', () => {
  expectReject("sample.txt", "Your prompts never leave your machine.", "R-2");
});

test('r4 must fail: "Kept 12 months as the FDIC requires."', () => {
  expectReject(
    "sample.txt",
    "Kept 12 months as the FDIC requires.",
    "regulatory",
  );
});

test('r4 must fail: "Retention of 12 months meets OCC requirements."', () => {
  expectReject(
    "sample.txt",
    "Retention of 12 months meets OCC requirements.",
    "regulatory",
  );
});

test('r4 must fail: "Every pass writes an immutable log."', () => {
  expectReject(
    "sample.txt",
    "Every pass writes an immutable log.",
    "immutable",
  );
});

test('r4 must pass: "A log of every tool call, kept on your systems."', () => {
  expectAllow("A log of every tool call, kept on your systems.");
});

test('r4 must pass: "A tamper-evident audit log of every tool call."', () => {
  expectAllow("A tamper-evident audit log of every tool call.");
});

test('r4 must pass: "Agents stay inside your trust boundary."', () => {
  expectAllow("Agents stay inside your trust boundary.");
});

test("r4 must pass: approved logging and retention text", () => {
  expectAllow(APPROVED_LOGGING_AND_RETENTION);
});

test("N-1 does not treat agents as a subject", () => {
  expectAllow("Agents stay inside your trust boundary.");
  expectReject("sample.txt", "Models stay inside your trust boundary.", "N-1");
  expectReject("sample.txt", "Data stays here.", "N-1");
  expectAllow("Your files stay on your systems.");
  expectAllow("Stays in your systems");
});

test("kept locality patterns reject their phrases and allow a public-internet fact", () => {
  expectReject(
    "sample.txt",
    "Your data never resides anywhere except on your machine.",
    "never-resides",
  );
  expectReject(
    "sample.txt",
    "Your data never resides anywhere except on your machine.",
    "R-2",
  );
  expectReject("sample.txt", "Discovery stays inside the firm\u2019s wall.", "walls");
  expectReject("sample.txt", "The model stays inside the bank's wall.", "walls");
  expectReject(
    "sample.txt",
    "No customer file to the public internet.",
    "public-internet",
  );
  expectAllow("Inference is reached over the public internet with TLS.");
  expectReject("sample.txt", "Model run \u00b7 local", "model-run-local");
  expectReject("sample.txt", "Model run  \u00b7  local", "model-run-local");
  expectReject("sample.txt", "egress events: 0", "egress");
  expectReject("sample.txt", "Egress on customer files: none", "egress");
  expectAllow("Still no egress.");
  expectAllow("Reading policy overlay \u2014 no egress");
  expectReject("sample.txt", "Encrypted in, encrypted out.", "encrypted-in-out");
});

test("immutable and tamper-proof are banned; tamper-evident is allowed", () => {
  expectReject("sample.txt", "IMMUTABLE log", "immutable");
  expectAllow("Discuss immutability as a concept.");
  expectReject("sample.txt", "A planned immutable log.", "immutable");
  expectReject("sample.txt", "tamper-proof", "tamper-proof");
  expectReject("sample.txt", "tamper proof", "tamper-proof");
  expectReject("sample.txt", "tamperproof", "tamper-proof");
  expectAllow("tamper-evident");
  expectAllow("Tamper evident records.");
});

test("regulatory ban is one sentence, FDIC/FFIEC/OCC/NCUA/GLBA/regulat, within 60 characters", () => {
  expectReject(
    "sample.txt",
    "Kept 12 months as the FFIEC requires.",
    "regulatory",
  );
  expectReject(
    "sample.txt",
    "NCUA requirements include retention of 12 months.",
    "regulatory",
  );
  expectReject(
    "sample.txt",
    "GLBA requires records to be kept for 12 months.",
    "regulatory",
  );
  expectReject(
    "sample.txt",
    "Regulatory requirements say records are kept for 12 months.",
    "regulatory",
  );
  expectAllow("Kept for 12 months. The FDIC requires a different control.");
  expectAllow("The FDIC requires encryption. Records are kept for 12 months.");
  expectAllow(
    `The FDIC ${"x".repeat(61)} requires retention of 12 months.`,
  );
  expectReject(
    "sample.txt",
    `The FDIC ${"x".repeat(40)} requires retention of 12 months.`,
    "regulatory",
  );
  expectAllow("Kept 12 months for security investigations.");
  expectAllow("The FDIC requires multi-factor authentication.");
});

test('banned by name: "What was read, inferred, and approved"', () => {
  expectReject(
    "sample.txt",
    "What was read, inferred, and approved is recorded.",
    "read-inferred-approved",
  );
  expectReject(
    "sample.txt",
    "WHAT WAS READ, INFERRED, AND APPROVED",
    "read-inferred-approved",
  );
  expectReject(
    "sample.tsx",
    "What  was\nread,   inferred, and approved",
    "read-inferred-approved",
  );
});

test('r4 exact prohibition: "exam-ready trails"', () => {
  expectReject(
    "sample.txt",
    "Review and exam-ready trails on sensitive files.",
    "exam-ready-trails",
  );
  expectAllow("Exam-ready review of sensitive files.");
});

test("removed #28 bans stay removed", () => {
  expectAllow("Commit to audit log");
  expectAllow("Written to the log");
  expectAllow("Review committed to the in-bank log");
  expectAllow("the log stays");
  expectAllow("log hash ab12\u2026e21a");
  expectAllow("Audit log on the roadmap.");
  expectAllow("Prompts are never stored.");
  expectAllow("A planned audit log of every tool call.");
});

test("r4 exact strings are allowed by the checker", () => {
  for (const sample of [
    EXACT.trustTitle,
    EXACT.trustBody,
    EXACT.reviewerCombined,
    EXACT.products,
    EXACT.useCases,
    EXACT.demoTitle,
    EXACT.commit,
    EXACT.written,
    EXACT.inBank,
    EXACT.logStays,
    `${EXACT.logHash} ab12\u2026e21a`,
    EXACT.auditRow,
    EXACT.proof,
    EXACT.readme,
    APPROVED_LOGGING_AND_RETENTION,
  ]) {
    expectAllow(sample);
  }
});

test("order of operations: comments, tags, whitespace, sentences, then patterns", () => {
  const commented = check(
    "lib/site.ts",
    '// Your prompts never leave your machine.\nexport const label = "Blog";\n',
  );
  assert.deepEqual(commented, []);

  const block = check(
    "components/Example.tsx",
    "export function Example() {\n  return <p>{/* immutable */}</p>;\n}\n",
  );
  assert.deepEqual(block, []);

  const live = check(
    "components/Example.tsx",
    'export const claim = "Your prompts never leave your machine.";\n',
  );
  assert.equal(live.length, 1);
  assert.equal(
    formatHit(live[0]),
    'components/Example.tsx:1: prompts never leave',
  );

  const tagged = check(
    "components/Example.tsx",
    "<p>Your <em>prompts</em>\nnever leave your machine.</p>\n",
  );
  assert.ok(tagged.some((hit) => hit.rule === "R-2"));
  assert.match(formatHit(tagged[0]), /^components\/Example\.tsx:\d+: /);

  const markdown = check("README.md", "See https://example.com for an immutable log.\n");
  assert.ok(markdown.some((hit) => hit.rule === "immutable"));

  const site = readRepo("lib/site.ts");
  const prepared = prepare("lib/site.ts", site).text;
  assert.equal(prepared.includes("never leaves that subdomain"), false);
  assert.equal(
    REPO_HITS.some((hit) => hit.file === "lib/site.ts" && hit.line === 27),
    false,
  );
});

test("file scope includes README.md and public text files", () => {
  const files = scopeFiles().map(rel);
  assert.ok(files.includes("README.md"));
  assert.ok(files.includes("public/.well-known/security.txt"));
  assert.ok(files.includes("app/page.tsx"));
  assert.ok(files.includes("components/Hero.tsx"));
  assert.ok(files.includes("lib/site.ts"));
  assert.ok(
    files.includes(
      "content/blog/zero-retention-isnt-zero-if-someone-still-reads-your-prompts-for-safety.md",
    ),
  );
  assert.equal(
    files.some((file) => file.endsWith(".png") || file.endsWith(".ico")),
    false,
  );
  assert.equal(files.includes("SECURITY.md"), false);
  assert.equal(files.includes("package.json"), false);
  assert.equal(files.includes("src/site-claims.test.ts"), false);
  assert.equal(files.includes("src/next-lockfile.test.ts"), false);
  assert.equal(
    files.some((file) => file.startsWith(".github/")),
    false,
  );
});

test("failure messages name file:line and the offending text", () => {
  const hits = check(
    "components/Hero.tsx",
    "Secure access.\nYour data never resides anywhere except on your machine.\n",
  );
  const resides = hits.find((hit) => hit.rule === "never-resides");
  assert.ok(resides);
  assert.equal(
    formatHit(resides),
    "components/Hero.tsx:2: never resides anywhere except",
  );
  const leave = hits.find((hit) => hit.rule === "R-2");
  assert.ok(leave);
  assert.equal(formatHit(leave), "components/Hero.tsx:2: data never resides");
});

const SITE_RULES: { rule: string; name: string }[] = [
  { rule: "N-1", name: "site: N-1 stays pattern (no agents subject)" },
  { rule: "never-resides", name: "site: never resides anywhere except" },
  { rule: "walls", name: "site: firm or bank wall" },
  { rule: "public-internet", name: "site: negative public-internet claim" },
  { rule: "model-run-local", name: "site: model run · local" },
  { rule: "egress", name: "site: egress none or 0" },
  { rule: "encrypted-in-out", name: "site: encrypted in, encrypted out" },
  { rule: "R-2", name: "site: R-2 never leave or reside" },
  { rule: "immutable", name: "site: immutable" },
  { rule: "tamper-proof", name: "site: tamper-proof" },
  { rule: "regulatory", name: "site: per-sentence FDIC/FFIEC retention requirement" },
  {
    rule: "read-inferred-approved",
    name: 'site: "What was read, inferred, and approved"',
  },
  { rule: "exam-ready-trails", name: 'site: "exam-ready trails"' },
];

for (const { rule, name } of SITE_RULES) {
  test(name, () => {
    assertRuleClean(rule);
  });
}

test('r4 exact string: TrustBoundary title is "Tamper-evident audit log"', () => {
  assertPublished(
    "components/TrustBoundary.tsx",
    EXACT.trustTitle,
    "Audit log (on the roadmap)",
  );
});

test("r4 exact string: TrustBoundary body records every harness tool call", () => {
  assertPublished(
    "components/TrustBoundary.tsx",
    EXACT.trustBody,
    "Every harness tool call, recorded",
  );
});

test('r4 exact string: TrustBoundary keeps "Reviewer + log" and "Sign-off, then a hash"', () => {
  const source = readRepo("components/TrustBoundary.tsx");
  const missing = [EXACT.reviewer, EXACT.signOffHash].filter(
    (part) => !source.includes(part),
  );
  if (missing.length === 0) return;
  const line = lineOf(source, "Reviewer sign-off");
  assert.fail(
    `components/TrustBoundary.tsx:${line}: ${lineText(source, line)}`,
  );
});

test("r4 exact string: Products.tsx exam-prep tamper-evident log wording", () => {
  const source = readRepo("components/Products.tsx");
  const missing = [EXACT.productsLead, EXACT.productsLog].filter(
    (part) => !source.includes(part),
  );
  if (missing.length === 0) return;
  const line = lineOf(source, "Exam-ready review of sensitive files");
  assert.fail(`components/Products.tsx:${line}: ${lineText(source, line)}`);
});

test('r4 exact string: UseCases.tsx is "Audit log · on your systems"', () => {
  assertPublished(
    "components/UseCases.tsx",
    EXACT.useCases,
    "Audit log \u00b7 planned",
  );
});

test('r4 exact string: ProductDemo panel title is "Audit log (demo)"', () => {
  assertPublished(
    "components/ProductDemo.tsx",
    EXACT.demoTitle,
    "Activity (demo)",
  );
});

test('r4 exact string: Proof.tsx keeps "The log stays behind."', () => {
  assertPublished(
    "components/Proof.tsx",
    EXACT.proof,
    "Human sign-off stays in the loop",
  );
});

test('r4 exact string: README uses "a tamper-evident audit log on your systems"', () => {
  assertPublished("README.md", EXACT.readme, "an immutable log");
});
