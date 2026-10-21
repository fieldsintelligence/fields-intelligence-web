import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, normalize } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

// Web #32: deploy-path hardening (Gray Beard's spec with Blue Hat's additions).
// Round 1 of the test loop (Test's mutation run): quote-aware comment handling,
// more production paths banned, anchored scope, flags before the subcommand,
// every way of sharing the Vercel IDs, pins and secret checked outside comments,
// flow-style uses:, permissions, the fork guard and the preview checkout ref.

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const WORKFLOWS = join(ROOT, ".github", "workflows");
const RELEASE = "deploy-release.yml";
const ORG_ID = "team_m5ApD0j2P01y0kiswd9aGVjD";
const PROJECT_ID = "prj_aunxZgkQhfy9xL4ddL8xJbeAMd6r";
const ID_PREFIX = `VERCEL_ORG_ID=${ORG_ID} VERCEL_PROJECT_ID=${PROJECT_ID} vercel`;
const VERCEL_CLI = "vercel@62.4.0";
const FORK_GUARD = /^\s*(-\s+)?if:\s*(\$\{\{\s*)?github\.event\.pull_request\.head\.repo\.full_name\s*==\s*github\.repository(\s*\}\})?\s*$/;
const HEAD_REF = /^\s*ref:\s*\$\{\{\s*github\.event\.pull_request\.head\.sha\s*\}\}\s*$/;

// Drops a `#` comment only when the `#` is outside single and double quotes and
// starts the line or follows whitespace (YAML and shell agree on that). An
// unclosed quote keeps the rest of the line, so a ban still sees it.
function stripComment(raw: string): string {
  let quote = "";
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (quote) {
      if (quote === '"' && c === "\\") i++;
      else if (c === quote) quote = "";
    } else if (c === '"' || c === "'") {
      quote = c;
    } else if (c === "#" && (i === 0 || /\s/.test(raw[i - 1]!))) {
      return raw.slice(0, i).trimEnd();
    }
  }
  return raw.trimEnd();
}

// Strict view for "must contain" checks: cuts at any ` #`, quoted or not, so a
// pin, gate, scope, ID or secret that only appears after a `#` never counts.
function stripAnyHash(raw: string): string {
  return raw.replace(/(^|\s)#.*$/, "").trimEnd();
}

type Line = { code: string; strict: string };

// Logical lines: shell `\` continuations joined, in both views.
function logicalLines(text: string): Line[] {
  const out: Line[] = [];
  let code = "";
  let strict = "";
  for (const raw of text.split("\n")) {
    const c = stripComment(raw);
    const s = stripAnyHash(raw);
    if (c.endsWith("\\")) {
      code += c.slice(0, -1) + " ";
      strict += (s.endsWith("\\") ? s.slice(0, -1) : s) + " ";
      continue;
    }
    out.push({ code: code + c, strict: strict + s });
    code = "";
    strict = "";
  }
  if (code) out.push({ code, strict });
  return out;
}

// Shell quotes removed, so `--pr""od` or `"--prod"` still reads as --prod.
const unquoted = (l: string) => l.replace(/["']/g, "");
const anyMatch = (l: string, re: RegExp) => re.test(l) || re.test(unquoted(l));

const workflows = readdirSync(WORKFLOWS)
  .filter((name) => /\.ya?ml$/.test(name))
  .map((name) => {
    const text = readFileSync(join(WORKFLOWS, name), "utf8");
    const logical = logicalLines(text);
    return { name, text, logical, lines: logical.map((l) => l.code), strict: logical.map((l) => l.strict) };
  });
const others = () => workflows.filter((w) => w.name !== RELEASE);

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

// A vercel deploy with any flags before the subcommand.
const DEPLOY = /\bvercel\b.*\bdeploy\b/;
function deployLines(lines: Line[]): Line[] {
  return lines.filter((l) => anyMatch(l.code, DEPLOY));
}

// Production paths that only deploy-release.yml may use (and it uses only --prod).
const PROD_PATHS: [RegExp, string][] = [
  [/--prod\b/, "--prod"],
  [/--target[ =](?!preview(\s|$))/, "--target other than preview (e.g. --target=production)"],
  [/\bvercel\b.*\b(promote|alias|rollback)\b/, "vercel promote / alias / rollback"],
  [/--\$\{\{/, "a flag built from a ${{ }} expression"],
  [/\$\{\{[^}]*prod/i, "a ${{ }} expression that spells prod"],
];
const AUTO_CONFIRM: [RegExp, string][] = [
  [/(^|\s)--(yes|confirm)(\s|=|$)/, "--yes / --confirm"],
];

// Files a workflow can call: repo paths named in workflow lines, every
// package.json script (npm test / npm run), and the files those name in turn.
function calledScripts(): { path: string; text: string }[] {
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as { scripts?: Record<string, string> };
  const seeds = [...workflows.flatMap((w) => w.lines), ...Object.values(pkg.scripts ?? {})];
  const found = new Map<string, string>();
  const queue = [...seeds];
  while (queue.length) {
    const line = queue.shift()!;
    for (const m of unquoted(line).matchAll(/(?:^|[\s;&|(=])((?:\.\/)?[\w.-]+(?:\/[\w.-]+)*\.(?:sh|bash|mjs|cjs|js|ts|py)|(?:\.\/)?scripts\/[\w./-]+)/g)) {
      const rel = normalize(m[1]!);
      // node --test files hold the guard's own patterns; they are not deploy scripts.
      if (rel.startsWith("..") || rel.startsWith("node_modules") || /\.test\.[cm]?[jt]s$/.test(rel)) continue;
      const abs = join(ROOT, rel);
      if (found.has(rel) || !existsSync(abs) || !statSync(abs).isFile()) continue;
      const text = readFileSync(abs, "utf8");
      found.set(rel, text);
      queue.push(...text.split("\n"));
    }
  }
  return [...found].map(([path, text]) => ({ path, text }));
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

// (d) the gate, the CLI pin and the token secret count only outside comments.
function assertGateAndPin(w: (typeof workflows)[number], label: string) {
  assert.ok(w.strict.some((l) => /npm ci\b.*&&\s*npm test\b/.test(l)), `${label}: npm ci && npm test gate missing`);
  assert.ok(
    w.strict.some((l) => l.includes(`npm install --global ${VERCEL_CLI}`)),
    `${label}: Vercel CLI must be pinned to 62.4.0 (outside comments)`,
  );
  for (const l of w.lines) {
    if (/\bvercel@/.test(l)) assert.ok(/\bvercel@62\.4\.0(\s|$)/.test(l), `${label}: unpinned Vercel CLI: ${l.trim()}`);
    assert.ok(!/\b(npm|pnpm|yarn)\b.*\b(install|i|add)\b.*\svercel(\s|$)/.test(unquoted(l)), `${label}: Vercel CLI installed without a version: ${l.trim()}`);
  }
  assert.ok(
    w.strict.some((l) => /^\s*VERCEL_TOKEN:\s*\$\{\{\s*secrets\.VERCEL_TOKEN\s*\}\}\s*$/.test(l)),
    `${label}: VERCEL_TOKEN must come from secrets.VERCEL_TOKEN (outside comments)`,
  );
  assert.ok(!w.lines.some((l) => /\bvars\.VERCEL_TOKEN\b/.test(l)), `${label}: VERCEL_TOKEN must not come from vars`);
}

test("deploy-release.yml keeps the npm ci && npm test gate, pinned Vercel CLI and token secret", () => {
  const release = workflows.find((w) => w.name === RELEASE)!;
  assertGateAndPin(release, RELEASE);
  assert.equal(
    deployLines(release.logical).filter((l) => anyMatch(l.code, /--prod\b/)).length,
    1,
    "expected one prod deploy",
  );
});

test("no workflow other than deploy-release.yml has a production path (--prod, --target production, promote, alias, rollback)", () => {
  for (const w of others()) {
    for (const l of w.lines) {
      for (const [re, what] of PROD_PATHS) assert.ok(!anyMatch(l, re), `${w.name} uses ${what}: ${l.trim()}`);
    }
  }
});

test("no script a workflow calls (repo files, package.json scripts) has a production path or --yes", () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as { scripts?: Record<string, string> };
  const sources = [
    ...Object.entries(pkg.scripts ?? {}).map(([k, v]) => ({ path: `package.json scripts.${k}`, lines: [v] })),
    ...calledScripts().map((s) => ({ path: s.path, lines: s.text.split("\n").map(stripComment) })),
  ];
  for (const { path, lines } of sources) {
    for (const l of lines) {
      for (const [re, what] of [...PROD_PATHS, ...AUTO_CONFIRM]) assert.ok(!anyMatch(l, re), `${path} uses ${what}: ${l.trim()}`);
    }
  }
});

test("no workflow uses --yes or --confirm outside deploy-release.yml", () => {
  for (const w of others()) {
    for (const l of w.lines) {
      for (const [re, what] of AUTO_CONFIRM) assert.ok(!anyMatch(l, re), `${w.name} uses ${what}: ${l.trim()}`);
      assert.ok(!(anyMatch(l, /(^|\s)-y(\s|=|$)/) && /\bvercel\b/.test(l)), `${w.name} uses -y: ${l.trim()}`);
    }
  }
});

test("every vercel deploy passes --scope fieldsintelligence and per-command IDs", () => {
  const all = workflows.flatMap((w) => deployLines(w.logical).map((l) => ({ name: w.name, l })));
  assert.ok(all.length > 0, "no vercel deploy found in workflows");
  for (const { name, l } of all) {
    assert.ok(/--scope[ =]fieldsintelligence(\s|$)/.test(l.strict), `${name}: vercel deploy without --scope fieldsintelligence: ${l.code.trim()}`);
    assert.ok(!/--scope[ =](?!fieldsintelligence(\s|$))/.test(l.code), `${name}: second or wrong --scope: ${l.code.trim()}`);
    assert.ok(/(^|[\s;&|(])VERCEL_ORG_ID=\S+ VERCEL_PROJECT_ID=\S+ vercel\b.*\bdeploy\b/.test(l.strict), `${name}: IDs must prefix the vercel command`);
    assert.ok(l.strict.includes(ID_PREFIX), `${name}: vercel deploy without per-command org and project IDs`);
  }
});

test("no workflow shares Vercel org or project IDs (env maps, export, GITHUB_ENV, any other use)", () => {
  for (const w of workflows) {
    for (const l of w.lines) {
      assert.ok(!/VERCEL_(ORG|PROJECT)_ID["']?\s*:/.test(l), `${w.name} sets Vercel IDs in an env: map: ${l.trim()}`);
      assert.ok(!/\b(export|declare\s+-\w*x\w*|typeset\s+-\w*x\w*)\b.*\bVERCEL_(ORG|PROJECT)_ID\b/.test(l), `${w.name} exports Vercel IDs: ${l.trim()}`);
      assert.ok(!(/VERCEL_(ORG|PROJECT)_ID/.test(l) && /GITHUB_ENV/.test(l)), `${w.name} writes IDs to GITHUB_ENV: ${l.trim()}`);
      // The only allowed mention is the exact per-command prefix.
      const rest = l.split(ID_PREFIX).join(" ");
      assert.ok(!/VERCEL_(ORG|PROJECT)_ID/.test(rest), `${w.name} uses Vercel IDs outside the per-command prefix: ${l.trim()}`);
    }
  }
});

type Step = { lines: string[] };
function steps(lines: string[]): Step[] {
  const out: Step[] = [];
  let itemIndent = -1;
  let inSteps = false;
  let stepsIndent = -1;
  let cur: Step | null = null;
  for (const l of lines) {
    if (!l.trim()) continue;
    const indent = l.length - l.trimStart().length;
    if (/^\s*steps:\s*$/.test(l)) {
      inSteps = true;
      stepsIndent = indent;
      itemIndent = -1;
      continue;
    }
    if (!inSteps) continue;
    if (indent <= stepsIndent) {
      inSteps = false;
      cur = null;
      continue;
    }
    if (itemIndent < 0 && /^\s*-\s/.test(l)) itemIndent = indent;
    if (indent === itemIndent && /^\s*-(\s|$)/.test(l)) {
      cur = { lines: [l] };
      out.push(cur);
    } else if (cur) cur.lines.push(l);
  }
  return out;
}

test("the pull_request preview workflow: pinned CLI, gate, secret, fork guard on both deploy steps, head-SHA checkout", () => {
  for (const w of workflows) {
    assert.ok(!w.lines.some((l) => /\bpull_request_target\b/.test(l)), `${w.name} uses pull_request_target`);
  }
  const previews = workflows.filter(
    (w) => onBlock(w.lines).some((l) => /^ {2}pull_request:/.test(l)) && deployLines(w.logical).length > 0,
  );
  assert.equal(previews.length, 1, "expected exactly one pull_request workflow that runs vercel deploy");
  const preview = previews[0]!;
  assert.ok(!preview.lines.some((l) => anyMatch(l, /--prod\b/)), "preview workflow must not use --prod");
  assertGateAndPin(preview, preview.name);

  // (f) fork guard on BOTH preview deploy steps: the CLI install and the deploy.
  const vercelSteps = steps(preview.lines).filter((s) =>
    s.lines.some((l) => !/^\s*-?\s*name:/.test(l) && (/\bvercel\b/.test(l) || /secrets\.VERCEL_TOKEN/.test(l))),
  );
  assert.ok(vercelSteps.length >= 2, `expected the Vercel CLI install and deploy steps, found ${vercelSteps.length}`);
  for (const s of vercelSteps) {
    assert.ok(s.lines.some((l) => FORK_GUARD.test(l)), `preview step lacks the fork guard if:: ${s.lines[0]!.trim()}`);
  }

  // (g) the preview builds the PR head, so the deployment traces to it.
  const checkouts = steps(preview.lines).filter((s) => s.lines.some((l) => /uses:\s*["']?actions\/checkout@/.test(l)));
  assert.equal(checkouts.length, 1, "preview must check out exactly once");
  assert.ok(checkouts[0]!.lines.some((l) => HEAD_REF.test(l)), "preview checkout must use ref: ${{ github.event.pull_request.head.sha }}");
  assert.ok(!preview.lines.some((l) => /\bGITHUB_SHA\b|\bgithub\.sha\b/.test(l)), "preview must report the PR head SHA, not the merge SHA");
});

test("(f) every workflow and job grants only contents: read, never write-all", () => {
  for (const w of workflows) {
    assert.ok(!w.lines.some((l) => /\b(write-all|read-all)\b/.test(l)), `${w.name} uses write-all/read-all`);
    let topLevel = false;
    w.lines.forEach((l, i) => {
      const m = /^(\s*)permissions:\s*(.*)$/.exec(l);
      if (!m) return;
      const indent = m[1]!.length;
      if (indent === 0) topLevel = true;
      const inline = m[2]!.trim();
      if (inline) {
        assert.match(inline, /^\{\s*contents:\s*read\s*\}$/, `${w.name}: permissions must be contents: read: ${l.trim()}`);
        return;
      }
      const body: string[] = [];
      for (const n of w.lines.slice(i + 1)) {
        if (!n.trim()) continue;
        if (n.length - n.trimStart().length <= indent) break;
        body.push(n.trim());
      }
      assert.deepEqual(body, ["contents: read"], `${w.name}: permissions must be exactly contents: read`);
    });
    assert.ok(topLevel, `${w.name}: missing top-level permissions: contents: read`);
  }
});

test("no workflow runs vercel link, vercel pull, or vercel env pull", () => {
  for (const w of workflows) {
    for (const l of w.lines) {
      assert.ok(!anyMatch(l, /\bvercel\b.*\b(link|pull)\b/), `${w.name} runs link/pull/env pull: ${l.trim()}`);
    }
  }
});

test("every action in every workflow is pinned by commit SHA (block and flow style)", () => {
  let seen = 0;
  for (const w of workflows) {
    for (const l of w.lines) {
      for (const m of l.matchAll(/(?:^|[\s{,-])uses\s*:\s*([^\s,}]+)/g)) {
        seen++;
        const ref = m[1]!.replace(/^["']|["']$/g, "");
        assert.match(ref, /^[\w.-]+\/[\w./-]+@[0-9a-f]{40}$/, `${w.name}: unpinned action: ${l.trim()}`);
      }
    }
  }
  assert.ok(seen > 0, "no uses: found");
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
