import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

// Web #32: deploy-path hardening (Gray Beard's spec with Blue Hat's additions).

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const WORKFLOWS = join(ROOT, ".github", "workflows");
const RELEASE = "deploy-release.yml";
const ORG_ID = "team_m5ApD0j2P01y0kiswd9aGVjD";
const PROJECT_ID = "prj_aunxZgkQhfy9xL4ddL8xJbeAMd6r";
const VERCEL_CLI = "vercel@62.4.0";

// YAML lines with comments dropped and shell `\` continuations joined.
function codeLines(text: string): string[] {
  const out: string[] = [];
  let pending = "";
  for (const raw of text.split("\n")) {
    const line = raw.replace(/(^|\s)#.*$/, "").trimEnd();
    if (line.endsWith("\\")) {
      pending += line.slice(0, -1) + " ";
      continue;
    }
    out.push(pending + line);
    pending = "";
  }
  if (pending) out.push(pending);
  return out;
}

const workflows = readdirSync(WORKFLOWS)
  .filter((name) => /\.ya?ml$/.test(name))
  .map((name) => {
    const text = readFileSync(join(WORKFLOWS, name), "utf8");
    return { name, text, lines: codeLines(text) };
  });

function onBlock(lines: string[]): string[] {
  const start = lines.findIndex((l) => /^(on|"on"|'on'):\s*$/.test(l));
  assert.ok(start >= 0, "workflow has no block-style on: trigger");
  const block: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (/^\S/.test(line)) break;
    if (line.trim()) block.push(line);
  }
  return block;
}

function deployLines(lines: string[]): string[] {
  return lines.filter((l) => /\bvercel\s+deploy\b/.test(l));
}

test(".vercelignore exists and excludes .env* and .vercel", () => {
  const path = join(ROOT, ".vercelignore");
  assert.ok(existsSync(path), ".vercelignore is missing");
  const entries = readFileSync(path, "utf8")
    .split("\n")
    .map((l) => l.trim());
  assert.ok(entries.includes(".env*"), ".vercelignore does not exclude .env*");
  assert.ok(entries.includes(".vercel"), ".vercelignore does not exclude .vercel");
});

test("deploy-release.yml has exactly one trigger: release published", () => {
  const release = workflows.find((w) => w.name === RELEASE);
  assert.ok(release, `${RELEASE} is missing`);
  const block = onBlock(release.lines);
  const triggers = block.filter((l) => /^ {2}\S/.test(l)).map((l) => l.trim());
  assert.deepEqual(triggers, ["release:"], "release workflow must trigger on release only");
  assert.ok(
    block.some((l) => /^\s+types:\s*\[\s*published\s*\]\s*$/.test(l)),
    "release trigger must be types: [published]",
  );
  assert.ok(!block.some((l) => /\b(push|tags):/.test(l)), "tag push trigger must be removed");
});

test("deploy-release.yml keeps the npm ci && npm test gate and pinned Vercel CLI", () => {
  const release = workflows.find((w) => w.name === RELEASE)!;
  assert.ok(release.lines.some((l) => /npm ci\b.*&&\s*npm test\b/.test(l)), "npm ci && npm test gate missing");
  assert.ok(release.text.includes(`npm install --global ${VERCEL_CLI}`), "Vercel CLI must be pinned to 62.4.0");
  assert.equal(deployLines(release.lines).filter((l) => l.includes("--prod")).length, 1, "expected one prod deploy");
});

test("no workflow other than deploy-release.yml contains --prod", () => {
  for (const w of workflows.filter((w) => w.name !== RELEASE)) {
    assert.ok(!w.lines.some((l) => /--prod\b/.test(l)), `${w.name} contains --prod`);
  }
});

test("no workflow uses --yes outside deploy-release.yml", () => {
  for (const w of workflows.filter((w) => w.name !== RELEASE)) {
    assert.ok(!w.lines.some((l) => /(^|\s)(--yes|-y)(\s|=|$)/.test(l) && /vercel/.test(l)), `${w.name} uses --yes`);
  }
});

test("every vercel deploy passes --scope fieldsintelligence and per-command IDs", () => {
  const all = workflows.flatMap((w) => deployLines(w.lines).map((l) => ({ name: w.name, l })));
  assert.ok(all.length > 0, "no vercel deploy found in workflows");
  for (const { name, l } of all) {
    assert.ok(/--scope[ =]fieldsintelligence\b/.test(l), `${name}: vercel deploy without --scope fieldsintelligence`);
    assert.ok(
      l.includes(`VERCEL_ORG_ID=${ORG_ID} VERCEL_PROJECT_ID=${PROJECT_ID} vercel`),
      `${name}: vercel deploy without per-command org and project IDs`,
    );
  }
});

test("no workflow exports Vercel org or project IDs into a shared env", () => {
  for (const w of workflows) {
    assert.ok(!w.lines.some((l) => /^\s*VERCEL_(ORG|PROJECT)_ID\s*:/.test(l)), `${w.name} sets Vercel IDs in env:`);
    assert.ok(!w.lines.some((l) => /\bexport\s+VERCEL_(ORG|PROJECT)_ID\b/.test(l)), `${w.name} exports Vercel IDs`);
    assert.ok(!w.lines.some((l) => /VERCEL_(ORG|PROJECT)_ID=.*>>\s*"?\$GITHUB_ENV/.test(l)), `${w.name} writes IDs to GITHUB_ENV`);
  }
});

test("a preview workflow on pull_request (not pull_request_target) deploys without --prod", () => {
  for (const w of workflows) {
    assert.ok(!w.text.includes("pull_request_target"), `${w.name} uses pull_request_target`);
  }
  const previews = workflows.filter(
    (w) => onBlock(w.lines).some((l) => /^ {2}pull_request:/.test(l)) && deployLines(w.lines).length > 0,
  );
  assert.equal(previews.length, 1, "expected exactly one pull_request workflow that runs vercel deploy");
  const preview = previews[0]!;
  assert.ok(!preview.lines.some((l) => /--prod\b/.test(l)), "preview workflow must not use --prod");
  assert.ok(preview.text.includes(`npm install --global ${VERCEL_CLI}`), "preview must use pinned Vercel CLI 62.4.0");
  assert.ok(preview.lines.some((l) => /npm ci\b.*&&\s*npm test\b/.test(l)), "preview must run npm ci && npm test");
  assert.ok(preview.text.includes("secrets.VERCEL_TOKEN"), "preview must use the VERCEL_TOKEN secret");
});

test("no workflow runs vercel link, vercel pull, or vercel env pull", () => {
  for (const w of workflows) {
    assert.ok(!w.lines.some((l) => /\bvercel\s+(link|pull|env\s+pull)\b/.test(l)), `${w.name} runs link/pull/env pull`);
  }
});

test("every action in every workflow is pinned by commit SHA", () => {
  for (const w of workflows) {
    for (const l of w.lines.filter((l) => /^\s*-?\s*uses:/.test(l))) {
      assert.match(l, /uses:\s*[\w.-]+\/[\w./-]+@[0-9a-f]{40}\s*$/, `${w.name}: unpinned action: ${l.trim()}`);
    }
  }
});

test("AGENTS.md states the deploy rules", () => {
  const agents = readFileSync(join(ROOT, "AGENTS.md"), "utf8");
  for (const rule of [
    "## Deploy rules",
    `VERCEL_ORG_ID=${ORG_ID} VERCEL_PROJECT_ID=${PROJECT_ID} vercel`,
    "--scope fieldsintelligence",
    "--prod",
    "--yes",
    "fresh clone",
    "vercel pull",
    "vercel env pull",
    "vercel link",
    ".vercelignore",
    "gh release create",
  ]) {
    assert.ok(agents.includes(rule), `AGENTS.md is missing deploy rule text: ${rule}`);
  }
});
