import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const LOCKFILE = join(ROOT, "package-lock.json");
const PACKAGE_JSON = join(ROOT, "package.json");
const DEPENDABOT = join(ROOT, ".github", "dependabot.yml");

const REACT_PIN = "19.3.1";
const REACT_PACKAGES = ["react", "react-dom"] as const;

type LockPackage = {
  version?: string;
  resolved?: string;
  dependencies?: Record<string, string>;
};
type Lockfile = { packages?: Record<string, LockPackage> };
type Manifest = { dependencies?: Record<string, string> };

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

function readLockfile(): Lockfile {
  const parsed = readJson(LOCKFILE);
  assert.equal(typeof parsed, "object");
  assert.ok(parsed !== null, "lockfile parsed to null");
  const lock = parsed as Lockfile;
  assert.equal(typeof lock.packages, "object");
  assert.ok(lock.packages !== null, "lockfile parsed without a packages map");
  return lock;
}

function readManifest(): Manifest {
  const parsed = readJson(PACKAGE_JSON);
  assert.equal(typeof parsed, "object");
  assert.ok(parsed !== null, "package.json parsed to null");
  return parsed as Manifest;
}

function packageName(lockKey: string): string | null {
  const parts = lockKey.split("node_modules/");
  if (parts.length < 2) return null;
  const tail = parts[parts.length - 1] ?? "";
  if (tail.startsWith("@")) {
    const [scope, name] = tail.split("/");
    if (!scope || !name) return null;
    return `${scope}/${name}`;
  }
  const name = tail.split("/")[0];
  return name || null;
}

function isReactPackage(name: string): name is (typeof REACT_PACKAGES)[number] {
  return name === "react" || name === "react-dom";
}

// Problems that mean react and react-dom are not both pinned to REACT_PIN.
// A split bump (19.3.1 beside 19.3.0) and a stale pair both show up here.
function reactPinProblems(manifest: Manifest, lock: Lockfile): string[] {
  const problems: string[] = [];
  const declared = manifest.dependencies ?? {};
  const react = declared.react;
  const reactDom = declared["react-dom"];
  if (react !== REACT_PIN) {
    problems.push(`package.json react is ${String(react)}, expected ${REACT_PIN}`);
  }
  if (reactDom !== REACT_PIN) {
    problems.push(`package.json react-dom is ${String(reactDom)}, expected ${REACT_PIN}`);
  }
  if (react !== reactDom) {
    problems.push(
      `package.json react ${String(react)} and react-dom ${String(reactDom)} differ`,
    );
  }

  const root = lock.packages?.[""];
  if (!root) {
    problems.push("lockfile has no root package");
  } else {
    const rootDeps = root.dependencies ?? {};
    if (rootDeps.react !== REACT_PIN) {
      problems.push(`lockfile root react is ${String(rootDeps.react)}, expected ${REACT_PIN}`);
    }
    if (rootDeps["react-dom"] !== REACT_PIN) {
      problems.push(
        `lockfile root react-dom is ${String(rootDeps["react-dom"])}, expected ${REACT_PIN}`,
      );
    }
    if (rootDeps.react !== rootDeps["react-dom"]) {
      problems.push(
        `lockfile root react ${String(rootDeps.react)} and react-dom ${String(rootDeps["react-dom"])} differ`,
      );
    }
  }

  const packages = lock.packages ?? {};
  const seen = new Set<string>();
  for (const [lockKey, pkg] of Object.entries(packages)) {
    const name = packageName(lockKey);
    if (name === null || !isReactPackage(name)) continue;
    seen.add(name);
    const version = pkg.version;
    if (version !== REACT_PIN) {
      problems.push(`${name} entry ${lockKey} resolved to ${String(version)}, expected ${REACT_PIN}`);
    }
    const resolved = pkg.resolved ?? "";
    const expectedTarball = `/${name}/-/${name}-${REACT_PIN}.tgz`;
    if (!resolved.endsWith(expectedTarball)) {
      problems.push(`${name} entry ${lockKey} resolved URL ${resolved || "(missing)"} is not ${REACT_PIN}`);
    }
  }
  for (const name of REACT_PACKAGES) {
    if (!seen.has(name)) problems.push(`lockfile has no resolved ${name} entry`);
  }
  return problems;
}

function pinnedLock(react: string, reactDom: string, extra: Record<string, LockPackage> = {}): Lockfile {
  return {
    packages: {
      "": { dependencies: { react, "react-dom": reactDom } },
      "node_modules/react": {
        version: react,
        resolved: `https://registry.npmjs.org/react/-/react-${react}.tgz`,
      },
      "node_modules/react-dom": {
        version: reactDom,
        resolved: `https://registry.npmjs.org/react-dom/-/react-dom-${reactDom}.tgz`,
      },
      ...extra,
    },
  };
}

test("checker rejects a split or stale react / react-dom pin", () => {
  const good = { dependencies: { react: REACT_PIN, "react-dom": REACT_PIN } };
  assert.deepEqual(reactPinProblems(good, pinnedLock(REACT_PIN, REACT_PIN)), []);

  const splits: [string, string][] = [
    ["19.3.1", "19.3.0"],
    ["19.3.0", "19.3.1"],
    ["19.3.0", "19.3.0"],
    ["^19.3.1", "^19.3.1"],
    ["19.3.1", "19.3.2"],
  ];
  for (const [react, reactDom] of splits) {
    const problems = reactPinProblems(
      { dependencies: { react, "react-dom": reactDom } },
      pinnedLock(react, reactDom),
    );
    assert.ok(
      problems.length > 0,
      `checker accepted react ${react} with react-dom ${reactDom}`,
    );
  }

  const leftover = reactPinProblems(
    good,
    pinnedLock(REACT_PIN, REACT_PIN, {
      "node_modules/next/node_modules/react": {
        version: "19.3.0",
        resolved: "https://registry.npmjs.org/react/-/react-19.3.0.tgz",
      },
    }),
  );
  assert.ok(leftover.length > 0, "checker accepted a nested react 19.3.0");

  const typesOnly = reactPinProblems(
    good,
    pinnedLock(REACT_PIN, REACT_PIN, {
      "node_modules/@types/react": {
        version: "19.3.0",
        resolved: "https://registry.npmjs.org/@types/react/-/react-19.3.0.tgz",
      },
      "node_modules/@types/react-dom": {
        version: "19.3.0",
        resolved: "https://registry.npmjs.org/@types/react-dom/-/react-dom-19.3.0.tgz",
      },
    }),
  );
  assert.deepEqual(typesOnly, [], "checker treated @types/react as the react package");
});

test("package.json and the lockfile pin react and react-dom to 19.3.1", () => {
  const problems = reactPinProblems(readManifest(), readLockfile());
  if (problems.length > 0) assert.fail(problems.join("\n"));
});

function unquote(value: string): string {
  const trimmed = value.trim();
  const quoted = /^(["'])(.*)\1$/.exec(trimmed);
  return quoted ? (quoted[2] ?? "") : trimmed;
}

function indentOf(line: string): number {
  return line.length - line.trimStart().length;
}

// The npm ecosystem block, from its list item through the line before the next item.
function npmEcosystemLines(text: string): string[] {
  const lines = text.split("\n");
  let start = -1;
  for (let i = 0; i < lines.length; i += 1) {
    if (/^\s*-\s+package-ecosystem:\s*npm\s*(#.*)?$/.test(lines[i] ?? "")) {
      start = i;
      break;
    }
  }
  assert.ok(start >= 0, "dependabot.yml has no npm package-ecosystem");
  const itemIndent = indentOf(lines[start] ?? "");
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i += 1) {
    const line = lines[i] ?? "";
    if (line.trim() === "" || line.trim().startsWith("#")) continue;
    if (indentOf(line) <= itemIndent && /^\s*-\s+/.test(line)) {
      end = i;
      break;
    }
  }
  return lines.slice(start, end);
}

// Group name -> pattern list, for `groups` inside one ecosystem block.
function groupPatterns(lines: string[]): Record<string, string[]> {
  let groupsIndex = -1;
  let groupsIndent = -1;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? "";
    if (/^\s*groups:\s*(#.*)?$/.test(line)) {
      groupsIndex = i;
      groupsIndent = indentOf(line);
      break;
    }
  }
  assert.ok(groupsIndex >= 0, "npm ecosystem has no groups entry");
  const groups: Record<string, string[]> = {};
  let current: string | null = null;
  let inPatterns = false;
  let patternsIndent = -1;
  for (let i = groupsIndex + 1; i < lines.length; i += 1) {
    const line = lines[i] ?? "";
    if (line.trim() === "" || line.trim().startsWith("#")) continue;
    const indent = indentOf(line);
    if (indent <= groupsIndent) break;
    const group = /^(\s*)([A-Za-z][A-Za-z0-9_|-]*):\s*(#.*)?$/.exec(line);
    if (group && indent === groupsIndent + 2) {
      current = group[2] ?? null;
      if (current) groups[current] = [];
      inPatterns = false;
      continue;
    }
    if (current && /^\s*patterns:\s*(#.*)?$/.test(line)) {
      inPatterns = true;
      patternsIndent = indent;
      continue;
    }
    if (!current || !inPatterns) continue;
    if (indent <= patternsIndent) {
      inPatterns = false;
      continue;
    }
    const item = /^\s*-\s*(.+?)\s*(#.*)?$/.exec(line);
    if (item) groups[current]?.push(unquote(item[1] ?? ""));
  }
  return groups;
}

test("checker reads an npm groups entry and ignores other ecosystems", () => {
  const text = [
    "version: 2",
    "updates:",
    "  - package-ecosystem: npm",
    "    directory: /",
    "    groups:",
    "      react:",
    "        patterns:",
    '          - "react"',
    '          - "react-dom"',
    "  - package-ecosystem: github-actions",
    "    groups:",
    "      actions:",
    "        patterns:",
    '          - "react"',
    "",
  ].join("\n");
  assert.deepEqual(groupPatterns(npmEcosystemLines(text)), {
    react: ["react", "react-dom"],
  });
  const missing = groupPatterns(
    npmEcosystemLines(text.replace('          - "react-dom"\n', "")),
  );
  assert.deepEqual(missing.react, ["react"]);
});

test("dependabot npm group keeps react and react-dom in one pull request", () => {
  const groups = groupPatterns(npmEcosystemLines(readFileSync(DEPENDABOT, "utf8")));
  const paired = Object.entries(groups).filter(([, patterns]) => {
    const names = new Set(patterns);
    return names.has("react") && names.has("react-dom");
  });
  assert.equal(
    paired.length,
    1,
    `expected one npm group containing react and react-dom, found ${JSON.stringify(groups)}`,
  );
  const [, patterns] = paired[0] ?? [];
  assert.deepEqual(
    [...(patterns ?? [])].sort(),
    ["react", "react-dom"],
    "the react group should list only react and react-dom",
  );
});
