import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const WORKFLOWS = join(ROOT, ".github", "workflows");

const NODE_VERSION = "24.22.1";
const ENGINES_NODE = ">=24.22.1 <25";
const VERCEL_CLI = "62.4.0";
const SETUP_NODE_STEPS: Record<string, number> = { "deploy-release.yml": 1, "pr-audit.yml": 1 };
const VERCEL_INSTALLS: Record<string, number> = { "deploy-release.yml": 1 };

type SetupNodeStep = { line: number; nodeVersion: string | null };

function unquote(value: string): string {
  const trimmed = value.replace(/\s+#.*$/, "").trim();
  const quoted = /^(["'])(.*)\1$/.exec(trimmed);
  return quoted ? (quoted[2] ?? "") : trimmed;
}

function indentOf(line: string): number {
  return line.length - line.trimStart().length;
}

// Every `uses: actions/setup-node@...` step and the node-version in its `with:` block.
function setupNodeSteps(text: string): SetupNodeStep[] {
  const lines = text.split("\n");
  const steps: SetupNodeStep[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? "";
    if (!/^\s*(-\s+)?uses:\s*["']?actions\/setup-node@/.test(line)) continue;
    const dash = /^(\s*)-\s/.exec(line);
    let stepIndent = dash ? (dash[1] ?? "").length : -1;
    if (stepIndent < 0) {
      for (let j = i - 1; j >= 0; j -= 1) {
        const prev = /^(\s*)-\s/.exec(lines[j] ?? "");
        if (prev) {
          stepIndent = (prev[1] ?? "").length;
          break;
        }
      }
    }
    let nodeVersion: string | null = null;
    for (let j = i + 1; j < lines.length; j += 1) {
      const next = lines[j] ?? "";
      if (next.trim() === "" || next.trim().startsWith("#")) continue;
      if (indentOf(next) <= stepIndent) break;
      const match = /^\s*node-version:\s*(.*)$/.exec(next);
      if (match) nodeVersion = unquote(match[1] ?? "");
    }
    steps.push({ line: i + 1, nodeVersion });
  }
  return steps;
}

// Workflow-wide problems: any node-version other than the exact pin, a
// node-version-file, check-latest, a floating or unpinned vercel CLI, npx vercel.
function workflowProblems(text: string): string[] {
  const problems: string[] = [];
  text.split("\n").forEach((raw, index) => {
    const line = raw.replace(/^\s*#.*$/, "");
    const where = `line ${index + 1}`;
    const version = /^\s*node-version:\s*(.*)$/.exec(line);
    if (version && unquote(version[1] ?? "") !== NODE_VERSION) {
      problems.push(`${where}: node-version ${unquote(version[1] ?? "")} is not ${NODE_VERSION}`);
    }
    if (/node-version-file/.test(line)) problems.push(`${where}: node-version-file`);
    if (/check-latest/.test(line)) problems.push(`${where}: check-latest`);
    for (const match of line.matchAll(/\bvercel@(\S*)/g)) {
      const pinned = unquote(match[1] ?? "");
      if (pinned !== VERCEL_CLI) problems.push(`${where}: vercel@${pinned} is not vercel@${VERCEL_CLI}`);
    }
    if (/\b(npx|dlx|bunx)\b[^\n]*\bvercel\b/.test(line)) problems.push(`${where}: npx vercel`);
    if (/\bnpm\s+(install|i|add)\b[^\n]*\bvercel\b(?!@)/.test(line)) {
      problems.push(`${where}: vercel installed without a version`);
    }
  });
  return problems;
}

function vercelInstalls(text: string): string[] {
  return text
    .split("\n")
    .filter((line) => !/^\s*#/.test(line))
    .filter((line) => /\bnpm\s+(install|i|add)\b[^\n]*\bvercel\b/.test(line));
}

function workflowFiles(): string[] {
  return readdirSync(WORKFLOWS)
    .filter((name) => name.endsWith(".yml") || name.endsWith(".yaml"))
    .sort();
}

function readWorkflow(name: string): string {
  return readFileSync(join(WORKFLOWS, name), "utf8");
}

type PackageJson = { engines?: { node?: unknown } };
type Lockfile = { packages?: Record<string, PackageJson> };

test("checker rejects floating, unpinned and file-based Node versions", () => {
  const step = (value: string) =>
    `steps:\n  - uses: actions/setup-node@abc\n    with:\n      ${value}\n      cache: npm\n`;
  const bad = [
    "node-version: 22",
    "node-version: 24",
    "node-version: '24'",
    "node-version: 24.x",
    "node-version: 24.22",
    "node-version: 24.22.0",
    "node-version: 24.22.1-rc.1",
    "node-version: lts/*",
    "node-version: latest",
    "node-version: node",
    "node-version: '>=24.22.1'",
    "node-version: ^24.22.1",
    "node-version-file: .nvmrc",
  ];
  for (const value of bad) {
    const text = step(value);
    assert.notDeepEqual(
      setupNodeSteps(text).map((s) => s.nodeVersion),
      [NODE_VERSION],
      `step check accepted ${value}`,
    );
    assert.ok(workflowProblems(text).length > 0, `workflow check accepted ${value}`);
  }
  const checkLatest = step(`node-version: ${NODE_VERSION}\n      check-latest: true`);
  assert.ok(workflowProblems(checkLatest).length > 0, "checker accepted check-latest");
  for (const value of [`node-version: ${NODE_VERSION}`, `node-version: "${NODE_VERSION}"`]) {
    const text = step(value);
    assert.deepEqual(setupNodeSteps(text), [{ line: 2, nodeVersion: NODE_VERSION }]);
    assert.deepEqual(workflowProblems(text), []);
  }
  const missing = "steps:\n  - uses: actions/setup-node@abc\n  - run: npm ci\n";
  assert.deepEqual(setupNodeSteps(missing), [{ line: 2, nodeVersion: null }]);
});

test("checker rejects floating, unpinned and npx vercel CLI installs", () => {
  for (const line of [
    "run: npm install --global vercel@latest",
    "run: npm install --global vercel@^62.4.0",
    "run: npm install --global vercel@62",
    "run: npm install --global vercel@62.4.1",
    "run: npm install --global vercel",
    "run: npm i -g vercel",
    "run: npx vercel deploy --prebuilt",
    "run: npx -y vercel@62.4.0 build",
  ]) {
    assert.ok(workflowProblems(line).length > 0, `checker accepted ${line}`);
  }
  assert.deepEqual(workflowProblems(`run: npm install --global vercel@${VERCEL_CLI}`), []);
});

test("A1: every actions/setup-node step pins node-version exactly 24.22.1", () => {
  const counts: Record<string, number> = {};
  const failures: string[] = [];
  for (const name of workflowFiles()) {
    const steps = setupNodeSteps(readWorkflow(name));
    if (steps.length > 0) counts[name] = steps.length;
    for (const step of steps) {
      if (step.nodeVersion !== NODE_VERSION) {
        failures.push(`${name} line ${step.line}: node-version ${String(step.nodeVersion)}, expected ${NODE_VERSION}`);
      }
    }
  }
  assert.deepEqual(counts, SETUP_NODE_STEPS, "unexpected set of setup-node steps");
  if (failures.length > 0) assert.fail(failures.join("\n"));
});

test("A2, A4: no workflow uses another node-version, node-version-file, check-latest, or an unpinned vercel CLI", () => {
  const failures = workflowFiles().flatMap((name) =>
    workflowProblems(readWorkflow(name)).map((problem) => `${name} ${problem}`),
  );
  if (failures.length > 0) assert.fail(failures.join("\n"));
});

test("A4: vercel CLI installs pin exactly vercel@62.4.0", () => {
  const counts: Record<string, number> = {};
  for (const name of workflowFiles()) {
    const installs = vercelInstalls(readWorkflow(name));
    if (installs.length === 0) continue;
    counts[name] = installs.length;
    for (const line of installs) {
      assert.equal(line.trim(), `run: npm install --global vercel@${VERCEL_CLI}`, `${name}: ${line.trim()}`);
    }
  }
  assert.deepEqual(counts, VERCEL_INSTALLS, "unexpected set of vercel CLI installs");
});

test("A3: package.json engines.node is exactly >=24.22.1 <25", () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as PackageJson;
  assert.equal(pkg.engines?.node, ENGINES_NODE);
});

test("package-lock.json root engines.node matches package.json", () => {
  const lock = JSON.parse(readFileSync(join(ROOT, "package-lock.json"), "utf8")) as Lockfile;
  assert.equal(lock.packages?.[""]?.engines?.node, ENGINES_NODE);
});
