import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const LOCKFILE = join(ROOT, "package-lock.json");
const PACKAGE_JSON = join(ROOT, "package.json");

const MINIMUM = {
  next: "16.4.2",
  sharp: "0.35.5",
} as const;

const NEXT_PIN = "16.4.5";

type LockPackage = {
  version?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
};
type Lockfile = { packages?: Record<string, LockPackage> };
type Manifest = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

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

function resolvedNamed(
  lock: Lockfile,
  match: (name: string) => boolean,
): { name: string; version: string }[] {
  const packages = lock.packages;
  assert.ok(packages, "lockfile parsed without a packages map");
  const entries: { name: string; version: string }[] = [];
  for (const [lockKey, pkg] of Object.entries(packages)) {
    const name = packageName(lockKey);
    if (name === null || !match(name)) continue;
    const version = pkg.version;
    if (typeof version !== "string") {
      assert.fail(`${name} entry ${lockKey} has no resolved version`);
    }
    entries.push({ name, version });
  }
  return entries;
}

function resolvedVersions(lock: Lockfile, name: string): string[] {
  return resolvedNamed(lock, (candidate) => candidate === name).map(
    (entry) => entry.version,
  );
}

function meetsFloor(version: string, minimum: string): boolean {
  if (version.includes("-")) return false;
  const [major = 0, minor = 0, patch = 0] = version.split(".").map(Number);
  const [minMajor = 0, minMinor = 0, minPatch = 0] = minimum.split(".").map(Number);
  if (major !== minMajor) return major > minMajor;
  if (minor !== minMinor) return minor > minMinor;
  return patch >= minPatch;
}

function assertAtLeast(name: string, version: string, minimum: string): void {
  if (!meetsFloor(version, minimum)) {
    assert.fail(
      `${name} resolved to ${version}, which is below the minimum ${minimum}`,
    );
  }
}

test("lockfile parses and resolves at least one next entry", () => {
  const lock = readLockfile();
  const next = resolvedVersions(lock, "next");
  assert.ok(
    next.length >= 1,
    "expected at least one resolved next entry in package-lock.json",
  );
});

test("version comparator orders major.minor.patch and rejects prerelease", () => {
  assert.equal(
    meetsFloor("16.4.10", "16.4.2"),
    true,
    "comparator treated 16.4.10 as below 16.4.2",
  );
  assert.equal(
    meetsFloor("16.4.2-canary", "16.4.2"),
    false,
    "comparator treated a prerelease as meeting the floor",
  );
});

test("every resolved next entry is >= 16.4.2", () => {
  for (const version of resolvedVersions(readLockfile(), "next")) {
    assertAtLeast("next", version, MINIMUM.next);
  }
});

// Missing sharp does not fail. The floor applies only to resolved entries;
// next declares sharp as an optional dependency, so a lockfile with no sharp
// package still satisfies this check. This repo currently resolves sharp.
test("every resolved sharp entry is >= 0.35.5", () => {
  for (const version of resolvedVersions(readLockfile(), "sharp")) {
    assertAtLeast("sharp", version, MINIMUM.sharp);
  }
});

test("resolved @next/env and @next/swc-* entries are >= 16.4.2", () => {
  const entries = resolvedNamed(
    readLockfile(),
    (name) => name === "@next/env" || name.startsWith("@next/swc-"),
  );
  assert.ok(
    entries.some((entry) => entry.name === "@next/env"),
    "expected a resolved @next/env entry",
  );
  assert.ok(
    entries.some((entry) => entry.name.startsWith("@next/swc-")),
    "expected a resolved @next/swc-* entry",
  );
  const failures = entries
    .filter((entry) => !meetsFloor(entry.version, MINIMUM.next))
    .map(
      (entry) =>
        `${entry.name} resolved to ${entry.version}, which is below the minimum ${MINIMUM.next}`,
    );
  if (failures.length > 0) assert.fail(failures.join("\n"));
});

function directNextPins(manifest: Manifest): { name: string; version: string }[] {
  return [
    ...Object.entries(manifest.dependencies ?? {}),
    ...Object.entries(manifest.devDependencies ?? {}),
  ]
    .filter(
      ([name]) =>
        name === "next" || name === "eslint-config-next" || name.startsWith("@next/"),
    )
    .map(([name, version]) => ({ name, version }));
}

test("package.json pins next, eslint-config-next, and direct @next/* at 16.4.5", () => {
  const pins = directNextPins(readManifest());
  const names = pins.map((pin) => pin.name);
  assert.ok(names.includes("next"), "package.json dependencies.next is missing");
  assert.ok(
    names.includes("eslint-config-next"),
    "package.json devDependencies.eslint-config-next is missing",
  );
  const failures = pins
    .filter((pin) => pin.version !== NEXT_PIN)
    .map((pin) => `${pin.name} is ${pin.version}, expected ${NEXT_PIN}`);
  if (failures.length > 0) assert.fail(failures.join("\n"));
});

test("lockfile resolves next to 16.4.5 only", () => {
  const lock = readLockfile();
  const root = lock.packages?.[""];
  assert.ok(root, "lockfile has no root package");
  assert.equal(root.dependencies?.next, NEXT_PIN);
  const versions = resolvedVersions(lock, "next");
  assert.ok(versions.length >= 1, "expected at least one resolved next entry");
  const unexpected = [...new Set(versions.filter((version) => version !== NEXT_PIN))].sort();
  assert.deepEqual(
    unexpected,
    [],
    `next resolved to ${versions.join(", ")}, expected only ${NEXT_PIN}`,
  );
  const text = readFileSync(LOCKFILE, "utf8");
  assert.equal(text.includes('"next": "16.4.3"'), false);
  assert.equal(text.includes("next-16.4.3.tgz"), false);
  assert.equal(text.includes('"version": "16.4.3"'), false);
});

test("lockfile resolves eslint-config-next and @next/* to 16.4.5", () => {
  const lock = readLockfile();
  const root = lock.packages?.[""];
  assert.ok(root, "lockfile has no root package");
  assert.equal(root.devDependencies?.["eslint-config-next"], NEXT_PIN);
  for (const [name, version] of Object.entries({
    ...root.dependencies,
    ...root.devDependencies,
    ...root.optionalDependencies,
  })) {
    if (name.startsWith("@next/")) assert.equal(version, NEXT_PIN, name);
  }
  const entries = resolvedNamed(
    lock,
    (name) => name === "eslint-config-next" || name.startsWith("@next/"),
  );
  assert.ok(
    entries.some((entry) => entry.name === "eslint-config-next"),
    "expected a resolved eslint-config-next entry",
  );
  assert.ok(
    entries.some((entry) => entry.name === "@next/env"),
    "expected a resolved @next/env entry",
  );
  assert.ok(
    entries.some((entry) => entry.name === "@next/eslint-plugin-next"),
    "expected a resolved @next/eslint-plugin-next entry",
  );
  assert.ok(
    entries.some((entry) => entry.name.startsWith("@next/swc-")),
    "expected a resolved @next/swc-* entry",
  );
  const failures = entries
    .filter((entry) => entry.version !== NEXT_PIN)
    .map((entry) => `${entry.name} resolved to ${entry.version}, expected ${NEXT_PIN}`);
  if (failures.length > 0) assert.fail(failures.join("\n"));
});
