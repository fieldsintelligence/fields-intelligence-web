import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

// #32 deploy-path guards, checked against the tag-push production workflow.
// Production stays on a v*.*.* tag push plus workflow_dispatch (v* refs only).
// One automatic event: a GitHub Release must not add a second deploy trigger.

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const WORKFLOWS = join(ROOT, ".github", "workflows");
const RELEASE = "deploy-release.yml";
const PREVIEW = "pr-preview.yml";
const NODE_VERSION = "24.22.1";
const VERCEL_CLI_LINE = "npm install --global vercel@62.4.0";
const GATE = "npm ci --no-audit && npm run build && npm test";
const FORK_GUARD =
  /^\s*(-\s+)?if:\s*(\$\{\{\s*)?github\.event\.pull_request\.head\.repo\.full_name\s*==\s*github\.repository(\s*\}\})?\s*$/;
const HEAD_REF = /^\s*ref:\s*\$\{\{\s*github\.event\.pull_request\.head\.sha\s*\}\}\s*$/;
const ID_PREFIX =
  /VERCEL_ORG_ID=\$\{\{\s*secrets\.VERCEL_ORG_ID\s*\}\} VERCEL_PROJECT_ID=\$\{\{\s*secrets\.VERCEL_PROJECT_ID\s*\}\} vercel\b/;
const TOKEN_FLAG = /--token(?:=|\s+)\$\{\{\s*secrets\.VERCEL_TOKEN\s*\}\}/;
const SCOPE_FLAG = /--scope(?:=|\s+)fieldsintelligence(?:\s|$)/;

const MAIN_TESTS = [
  "src/next-lockfile.test.ts",
  "src/react-lockfile.test.ts",
  "src/site-claims.test.ts",
  "src/how-it-works.test.ts",
  "src/fig3-v3-nav.test.ts",
  "src/home-how-it-works-teaser.test.ts",
  "src/how-it-works-nav.test.ts",
  "src/site-copy-r5.test.ts",
  "src/site-copy-npi-case.test.ts",
  "src/home-blog-section.test.ts",
  "src/blog-renderer.test.ts",
  "src/blog-zdr-figures.test.ts",
  "src/blog-backdoor-post.test.ts",
  "src/blog-index-label.test.ts",
  "src/blog-open-weight.test.ts",
  "src/blog-caption-inline.test.ts",
  "src/blog-body-link-hosts.test.ts",
  "src/blog-content-links.test.ts",
  "src/proxy-blog-redirect.test.ts",
  "src/home-order-nav.test.ts",
  "src/absolute-anchors.test.ts",
  "src/company-name-copy.test.ts",
  "src/node24-ci.test.ts",
  "src/deploy-path.test.ts",
];

type Role = "release" | "preview" | "other";

function stripComment(raw: string): string {
  let quote = "";
  for (let i = 0; i < raw.length; i += 1) {
    const c = raw[i] ?? "";
    if (quote) {
      if (quote === '"' && c === "\\") i += 1;
      else if (c === quote) quote = "";
    } else if (c === '"' || c === "'") {
      quote = c;
    } else if (c === "#" && (i === 0 || /\s/.test(raw[i - 1] ?? ""))) {
      return raw.slice(0, i).trimEnd();
    }
  }
  return raw.trimEnd();
}

function stripAnyHash(raw: string): string {
  return raw.replace(/(^|\s)#.*$/, "").trimEnd();
}

type Line = { code: string; strict: string };

function logicalLines(text: string): Line[] {
  const out: Line[] = [];
  let code = "";
  let strict = "";
  for (const raw of text.split("\n")) {
    const c = stripComment(raw);
    const s = stripAnyHash(raw);
    if (c.endsWith("\\")) {
      code += `${c.slice(0, -1)} `;
      strict += `${s.endsWith("\\") ? s.slice(0, -1) : s} `;
      continue;
    }
    out.push({ code: code + c, strict: strict + s });
    code = "";
    strict = "";
  }
  if (code || strict) out.push({ code, strict });
  return out;
}

const unquoted = (line: string): string => line.replace(/["']/g, "");

function onBlock(lines: string[]): string[] | null {
  const start = lines.findIndex((line) => /^(on|"on"|'on'):\s*$/.test(line));
  if (start < 0) return null;
  const block: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (/^\S/.test(line)) break;
    if (line.trim()) block.push(line);
  }
  return block;
}

function topKeys(block: string[]): string[] {
  return block.filter((line) => /^ {2}\S/.test(line)).map((line) => line.trim());
}

function childBlock(block: string[], key: string): string[] | null {
  const start = block.findIndex((line) => line.trim() === key && /^ {2}\S/.test(line));
  if (start < 0) return null;
  const out: string[] = [];
  for (const line of block.slice(start + 1)) {
    if (/^ {2}\S/.test(line)) break;
    if (line.trim()) out.push(line);
  }
  return out;
}

type Step = { lines: string[] };

function stepsOf(lines: string[]): Step[] {
  const out: Step[] = [];
  let itemIndent = -1;
  let inSteps = false;
  let stepsIndent = -1;
  let current: Step | null = null;
  for (const line of lines) {
    if (!line.trim()) continue;
    const indent = line.length - line.trimStart().length;
    if (/^\s*steps:\s*$/.test(line)) {
      inSteps = true;
      stepsIndent = indent;
      itemIndent = -1;
      continue;
    }
    if (!inSteps) continue;
    if (indent <= stepsIndent) {
      inSteps = false;
      current = null;
      continue;
    }
    if (itemIndent < 0 && /^\s*-\s/.test(line)) itemIndent = indent;
    if (indent === itemIndent && /^\s*-(\s|$)/.test(line)) {
      current = { lines: [line] };
      out.push(current);
    } else if (current) current.lines.push(line);
  }
  return out;
}

function usesRefs(lines: string[]): string[] {
  const refs: string[] = [];
  for (const line of lines) {
    for (const match of line.matchAll(/(?:^|[\s{,-])uses\s*:\s*([^\s,}]+)/g)) {
      refs.push((match[1] ?? "").replace(/^["']|["']$/g, ""));
    }
  }
  return refs;
}

function actionSha(lines: string[], action: string): string | null {
  for (const ref of usesRefs(lines)) {
    if (ref.startsWith(`${action}@`)) return ref.slice(action.length + 1);
  }
  return null;
}

function isDeployLine(line: string): boolean {
  const text = unquoted(line);
  return /\bvercel\b/.test(text) && /\bdeploy\b/.test(text);
}

function releaseTriggerProblems(lines: string[]): string[] {
  const problems: string[] = [];
  const block = onBlock(lines);
  if (!block) return ["missing block-style on: trigger"];
  const keys = topKeys(block);
  if (keys.some((key) => key === "release:" || key.startsWith("release:"))) {
    problems.push("release: trigger would deploy again when a tag is published");
  }
  const allowed = keys.length === 2 && keys[0] === "push:" && keys[1] === "workflow_dispatch:";
  if (!allowed) {
    problems.push(`production triggers must be push tags then workflow_dispatch, found ${keys.join(", ") || "(none)"}`);
  }
  const push = childBlock(block, "push:");
  if (!push) {
    problems.push("missing push: trigger");
  } else {
    const pushKeys = push.filter((line) => /^ {4}\S/.test(line)).map((line) => line.trim());
    if (pushKeys.some((key) => key !== "tags:")) {
      problems.push(`push trigger must list tags only, found ${pushKeys.join(", ")}`);
    }
    const tag = push.find((line) => /^\s+-\s+/.test(line));
    if (!tag || !/^\s+-\s+["']v\*\.\*\.\*["']\s*$/.test(tag)) {
      problems.push('push tags must include "v*.*.*"');
    }
  }
  if (!lines.some((line) => /if:/.test(line) && /startsWith\(\s*github\.ref\s*,\s*['"]refs\/tags\/v['"]\s*\)/.test(line))) {
    problems.push("workflow_dispatch must skip unless the ref is a v* tag");
  }
  if (!lines.some((line) => line.includes("^v[0-9]+\\.[0-9]+\\.[0-9]+"))) {
    problems.push("semver tag check is missing");
  }
  return problems;
}

function previewTriggerProblems(lines: string[]): string[] {
  const problems: string[] = [];
  const block = onBlock(lines);
  if (!block) return ["missing block-style on: trigger"];
  const keys = topKeys(block);
  if (keys.length !== 1 || keys[0] !== "pull_request:") {
    problems.push(`preview trigger must be pull_request only, found ${keys.join(", ") || "(none)"}`);
  }
  const body = (childBlock(block, "pull_request:") ?? []).map((line) => line.trim());
  const expected = ["branches:", "- main"];
  if (body.join("\n") !== expected.join("\n")) {
    problems.push("preview must run on pull_request branches: [main]");
  }
  return problems;
}

function permissionProblems(lines: string[]): string[] {
  const problems: string[] = [];
  let topLevel = false;
  lines.forEach((line, index) => {
    const match = /^(\s*)permissions:\s*(.*)$/.exec(line);
    if (!match) return;
    const indent = (match[1] ?? "").length;
    if (indent === 0) topLevel = true;
    const inline = (match[2] ?? "").trim();
    if (inline) {
      if (!/^\{\s*contents:\s*read\s*\}$/.test(inline)) {
        problems.push(`permissions must be contents: read (${line.trim()})`);
      }
      return;
    }
    const body: string[] = [];
    for (const next of lines.slice(index + 1)) {
      if (!next.trim()) continue;
      if (next.length - next.trimStart().length <= indent) break;
      body.push(next.trim());
    }
    if (body.length !== 1 || body[0] !== "contents: read") {
      problems.push(`permissions must be exactly contents: read (found ${body.join(", ") || "empty"})`);
    }
  });
  if (!topLevel) problems.push("missing top-level permissions: contents: read");
  if (lines.some((line) => /\b(write-all|read-all)\b/.test(line))) {
    problems.push("permissions use write-all or read-all");
  }
  return problems;
}

function deployProblems(line: Line, role: Role): string[] {
  if (!isDeployLine(line.code) && !isDeployLine(line.strict)) return [];
  const problems: string[] = [];
  const strict = unquoted(line.strict);
  const code = unquoted(line.code);
  if (role === "other") problems.push("vercel deploy is only allowed in deploy-release.yml and pr-preview.yml");
  if (!ID_PREFIX.test(strict)) {
    problems.push("vercel deploy must set secrets.VERCEL_ORG_ID and secrets.VERCEL_PROJECT_ID on that command");
  }
  if (!SCOPE_FLAG.test(strict)) problems.push("vercel deploy must pass --scope fieldsintelligence");
  if (/--scope(?:=|\s+)(?!fieldsintelligence(?:\s|$))/.test(code)) {
    problems.push("vercel deploy passes a scope other than fieldsintelligence");
  }
  if (!TOKEN_FLAG.test(strict)) problems.push("vercel deploy must pass --token from secrets.VERCEL_TOKEN");
  const prod = /--prod\b/.test(code);
  const yes = /(^|\s)--yes(\s|=|$)/.test(code);
  if (role === "release") {
    if (!prod) problems.push("production vercel deploy must pass --prod");
    if (!yes) problems.push("production vercel deploy must pass --yes");
  } else if (prod || yes) {
    problems.push("--prod and --yes are only allowed on the production deploy");
  }
  if (/--prebuilt\b/.test(code)) problems.push("vercel deploy must run remotely, without --prebuilt");
  return problems;
}

function lineProblems(line: Line, role: Role): string[] {
  const problems: string[] = [];
  const code = unquoted(line.code);
  const strict = unquoted(line.strict);
  if (/\bpull_request_target\b/.test(code)) problems.push("pull_request_target is not allowed");
  if (/\bvercel\b/.test(code) && /\b(link|pull|build)\b/.test(code)) {
    problems.push("vercel link, vercel pull, and vercel build are not allowed");
  }
  if (/--prebuilt\b/.test(code)) problems.push("--prebuilt is not allowed");
  if (role !== "release") {
    if (/--prod\b/.test(code)) problems.push("--prod is only allowed in deploy-release.yml");
    if (/(^|\s)--(yes|confirm)(\s|=|$)/.test(code)) problems.push("--yes / --confirm is only allowed in deploy-release.yml");
    if (/(^|\s)-y(\s|=|$)/.test(code) && /\bvercel\b/.test(code)) problems.push("-y is only allowed in deploy-release.yml");
    if (/\bvercel\b.*\b(promote|alias|rollback)\b/.test(code)) {
      problems.push("vercel promote, alias, and rollback are production paths");
    }
  } else if (/\bvercel\b.*\b(promote|alias|rollback)\b/.test(code)) {
    problems.push("production deploy is vercel deploy, not promote, alias, or rollback");
  }
  if (/VERCEL_(ORG|PROJECT)_ID/.test(code)) {
    const rest = code.replace(
      /VERCEL_ORG_ID=\$\{\{\s*secrets\.VERCEL_ORG_ID\s*\}\} VERCEL_PROJECT_ID=\$\{\{\s*secrets\.VERCEL_PROJECT_ID\s*\}\}/g,
      "",
    );
    if (/VERCEL_(ORG|PROJECT)_ID/.test(rest)) {
      problems.push("org and project IDs must appear only as the per-command prefix, not in env: or export");
    }
  }
  if (/node-version:/.test(strict)) {
    const value = /^\s*node-version:\s*(.*)$/.exec(line.strict)?.[1]?.replace(/\s+#.*$/, "").trim() ?? "";
    const bare = value.replace(/^["']|["']$/g, "");
    if (bare !== NODE_VERSION) problems.push(`node-version must be ${NODE_VERSION}`);
  }
  if (/\bvercel@(?!62\.4\.0(?:\s|$))/.test(code)) problems.push(`Vercel CLI must be pinned with ${VERCEL_CLI_LINE}`);
  problems.push(...deployProblems(line, role));
  return problems;
}

function sharedProblems(lines: string[], role: Role): string[] {
  const logical = logicalLines(lines.join("\n"));
  const problems = logical.flatMap((line) => lineProblems(line, role));
  for (const ref of usesRefs(logical.map((line) => line.code))) {
    if (!/^[\w.-]+\/[\w./-]+@[0-9a-f]{40}$/.test(ref)) problems.push(`unpinned action ${ref}`);
  }
  problems.push(...permissionProblems(logical.map((line) => line.code)));
  if (role === "release" || role === "preview") {
    const code = logical.map((line) => line.code);
    const strict = logical.map((line) => line.strict);
    if (!strict.some((line) => line.includes(GATE))) problems.push(`missing gate ${GATE}`);
    if (!strict.some((line) => line.includes(VERCEL_CLI_LINE))) problems.push(`missing ${VERCEL_CLI_LINE}`);
    if (!code.some((line) => /^\s*node-version:\s*["']?24\.22\.1["']?\s*$/.test(line))) {
      problems.push(`missing node-version ${NODE_VERSION}`);
    }
    const deploys = logical.filter((line) => isDeployLine(line.code));
    if (deploys.length !== 1) problems.push(`expected one vercel deploy, found ${deploys.length}`);
  }
  return problems;
}

function previewStepProblems(lines: string[]): string[] {
  const problems: string[] = [];
  const parsed = stepsOf(lines);
  const guarded = parsed.filter((step) =>
    step.lines.some((line) => !/^\s*-?\s*name:/.test(line) && (/\bvercel\b/.test(line) || /secrets\./.test(line))),
  );
  if (guarded.length === 0) problems.push("preview deploy step is missing");
  for (const step of guarded) {
    if (!step.lines.some((line) => FORK_GUARD.test(line))) {
      problems.push(`fork PRs must skip this step: ${step.lines[0] ?? "(step)"}`.trim());
    }
  }
  const checkouts = parsed.filter((step) => step.lines.some((line) => /uses:\s*["']?actions\/checkout@/.test(line)));
  if (checkouts.length !== 1) problems.push(`preview must check out exactly once, found ${checkouts.length}`);
  if (!checkouts.some((step) => step.lines.some((line) => HEAD_REF.test(line)))) {
    problems.push("preview checkout must use ref: ${{ github.event.pull_request.head.sha }}");
  }
  if (lines.some((line) => /\bgithub\.sha\b|\bGITHUB_SHA\b/.test(line))) {
    problems.push("preview must not use the merge SHA");
  }
  if (!lines.some((line) => /GITHUB_STEP_SUMMARY/.test(line) && /\$\{url\}/.test(line))) {
    problems.push("preview URL must be written to the job summary");
  }
  return problems;
}

function problemsFor(name: string, text: string): string[] {
  const role: Role = name === RELEASE ? "release" : name === PREVIEW ? "preview" : "other";
  const logical = logicalLines(text);
  const lines = logical.map((line) => line.code);
  const problems = sharedProblems(lines, role);
  if (role === "release") problems.push(...releaseTriggerProblems(lines));
  if (role === "preview") {
    problems.push(...previewTriggerProblems(lines));
    problems.push(...previewStepProblems(lines));
  }
  return problems;
}

function workflowNames(): string[] {
  return readdirSync(WORKFLOWS)
    .filter((name) => name.endsWith(".yml") || name.endsWith(".yaml"))
    .sort();
}

function readWorkflow(name: string): string {
  return readFileSync(join(WORKFLOWS, name), "utf8");
}

test("comment stripping keeps quoted hashes and drops real comments", () => {
  assert.equal(stripComment('url="a#b" # trailing'), 'url="a#b"');
  assert.equal(stripComment("# only a comment"), "");
  assert.equal(stripAnyHash("vercel deploy # --scope fieldsintelligence"), "vercel deploy");
});

test("checker rejects a second production trigger, shared IDs, and pull/build/prebuilt", () => {
  const sample = `
name: Deploy production release
on:
  release:
    types: [published]
  push:
    tags:
      - "v*.*.*"
permissions:
  contents: read
env:
  VERCEL_ORG_ID: \${{ secrets.VERCEL_ORG_ID }}
  VERCEL_PROJECT_ID: \${{ secrets.VERCEL_PROJECT_ID }}
jobs:
  Deploy-Production:
    if: \${{ startsWith(github.ref, 'refs/tags/v') }}
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1
      - uses: actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1
        with:
          node-version: 24.22.1
      - run: npm ci --no-audit && npm run build && npm test
      - run: npm install --global vercel@62.4.0
      - run: vercel pull --yes --environment=production --token=\${{ secrets.VERCEL_TOKEN }}
      - run: vercel build --prod --token=\${{ secrets.VERCEL_TOKEN }}
      - run: url="$(vercel deploy --prebuilt --prod --token=\${{ secrets.VERCEL_TOKEN }})"
`;
  const found = problemsFor(RELEASE, sample);
  for (const needle of ["release:", "per-command prefix", "vercel link, vercel pull", "--prebuilt", "--scope fieldsintelligence", "--yes"]) {
    assert.ok(
      found.some((problem) => problem.includes(needle)),
      `expected a problem containing ${JSON.stringify(needle)}\n${found.join("\n")}`,
    );
  }
});

test("checker accepts one remote production deploy and one guarded preview", () => {
  const release = `
name: Deploy production release
on:
  push:
    tags:
      - "v*.*.*"
  workflow_dispatch:
permissions:
  contents: read
jobs:
  Deploy-Production:
    if: \${{ startsWith(github.ref, 'refs/tags/v') }}
    steps:
      - run: |
          if [[ ! "$tag" =~ ^v[0-9]+\\.[0-9]+\\.[0-9]+ ]]; then exit 1; fi
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1
      - uses: actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1
        with:
          node-version: 24.22.1
      - run: npm ci --no-audit && npm run build && npm test
      - run: npm install --global vercel@62.4.0
      - run: url="$(VERCEL_ORG_ID=\${{ secrets.VERCEL_ORG_ID }} VERCEL_PROJECT_ID=\${{ secrets.VERCEL_PROJECT_ID }} vercel deploy --prod --yes --scope fieldsintelligence --token=\${{ secrets.VERCEL_TOKEN }})"
`;
  assert.deepEqual(problemsFor(RELEASE, release), []);

  const preview = `
name: Preview deploy
on:
  pull_request:
    branches:
      - main
permissions:
  contents: read
jobs:
  Deploy-Preview:
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1
        with:
          ref: \${{ github.event.pull_request.head.sha }}
      - uses: actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1
        with:
          node-version: 24.22.1
      - run: npm ci --no-audit && npm run build && npm test
      - if: github.event.pull_request.head.repo.full_name == github.repository
        run: npm install --global vercel@62.4.0
      - if: github.event.pull_request.head.repo.full_name == github.repository
        run: |
          url="$(VERCEL_ORG_ID=\${{ secrets.VERCEL_ORG_ID }} VERCEL_PROJECT_ID=\${{ secrets.VERCEL_PROJECT_ID }} vercel deploy --scope fieldsintelligence --token=\${{ secrets.VERCEL_TOKEN }})"
          echo "Preview deployment URL: \${url}" >> "$GITHUB_STEP_SUMMARY"
`;
  assert.deepEqual(problemsFor(PREVIEW, preview), []);
});

test("package.json test script keeps the current suite and deploy-path", () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as { scripts?: { test?: string } };
  const script = pkg.scripts?.test ?? "";
  for (const file of MAIN_TESTS) assert.ok(script.includes(file), `test script dropped ${file}`);
  const onDisk = readdirSync(join(ROOT, "src"))
    .filter((name) => name.endsWith(".test.ts"))
    .map((name) => `src/${name}`);
  for (const file of onDisk) assert.ok(script.includes(file), `test script does not run ${file}`);
});

test(".vercelignore excludes .env*, .vercel, node_modules, and .next", () => {
  const path = join(ROOT, ".vercelignore");
  assert.ok(existsSync(path), ".vercelignore is missing");
  const entries = readFileSync(path, "utf8")
    .split("\n")
    .map((line) => stripComment(line).trim())
    .filter(Boolean);
  for (const entry of [".env*", ".vercel", "node_modules", ".next"]) {
    assert.ok(entries.includes(entry), `.vercelignore does not exclude ${entry}`);
  }
});

test("deploy-release.yml keeps the tag-push gate and the #32 deploy guards", () => {
  const found = problemsFor(RELEASE, readWorkflow(RELEASE));
  assert.deepEqual(found, []);
});

test("pr-preview.yml deploys pull requests to main without production flags", () => {
  const path = join(WORKFLOWS, PREVIEW);
  assert.ok(existsSync(path), "pr-preview.yml is missing");
  const text = readFileSync(path, "utf8");
  assert.deepEqual(problemsFor(PREVIEW, text), []);
  const releaseLines = logicalLines(readWorkflow(RELEASE)).map((line) => line.code);
  const previewLines = logicalLines(text).map((line) => line.code);
  for (const action of ["actions/checkout", "actions/setup-node"]) {
    assert.equal(actionSha(previewLines, action), actionSha(releaseLines, action), `${action} pin`);
  }
});

test("other workflows do not gain a deploy path", () => {
  const failures = workflowNames()
    .filter((name) => name !== RELEASE && name !== PREVIEW)
    .flatMap((name) => problemsFor(name, readWorkflow(name)).map((problem) => `${name}: ${problem}`));
  assert.deepEqual(failures, []);
});

test("package scripts do not call vercel", () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as { scripts?: Record<string, string> };
  for (const [name, script] of Object.entries(pkg.scripts ?? {})) {
    assert.ok(!/\bvercel\b/.test(script), `${name} calls vercel`);
    assert.ok(!/--prod\b/.test(script) && !/--yes\b/.test(script), `${name} passes production flags`);
  }
});

test("AGENTS.md states deploy rules outside the Next.js block", () => {
  const agents = readFileSync(join(ROOT, "AGENTS.md"), "utf8");
  const begin = agents.indexOf("<!-- BEGIN:nextjs-agent-rules -->");
  const end = agents.indexOf("<!-- END:nextjs-agent-rules -->");
  assert.ok(begin >= 0 && end > begin, "Next.js agent block is missing");
  const rulesAt = agents.indexOf("## Deploy rules");
  assert.ok(rulesAt > end, "## Deploy rules must sit after the Next.js block");
  const rules = agents.slice(end);
  for (const phrase of [
    "## Deploy rules",
    "deploy-release.yml",
    "pr-preview.yml",
    "--prod",
    "--yes",
    "vercel link",
    "vercel pull",
    "vercel env pull",
    "VERCEL_ORG_ID",
    "VERCEL_PROJECT_ID",
    "secrets.VERCEL_ORG_ID",
    "secrets.VERCEL_PROJECT_ID",
    "--scope fieldsintelligence",
    "fresh clone",
    "delete",
    ".vercelignore",
    "`.env*`, `.vercel`, `node_modules`, and `.next`",
    "v*.*.*",
    "job summary",
  ]) {
    assert.ok(rules.includes(phrase), `AGENTS.md deploy rules are missing ${JSON.stringify(phrase)}`);
  }
});
