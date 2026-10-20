import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const semver = require("semver") as {
  gte: (version: string, minimum: string) => boolean;
};

const LOCKFILE = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "package-lock.json",
);

const MINIMUM = {
  next: "16.4.2",
  sharp: "0.35.5",
} as const;

type LockPackage = { version?: string };
type Lockfile = { packages?: Record<string, LockPackage> };

function readLockfile(): Lockfile {
  const parsed: unknown = JSON.parse(readFileSync(LOCKFILE, "utf8"));
  assert.equal(typeof parsed, "object");
  assert.ok(parsed !== null, "lockfile parsed to null");
  const lock = parsed as Lockfile;
  assert.equal(typeof lock.packages, "object");
  assert.ok(lock.packages !== null, "lockfile parsed without a packages map");
  return lock;
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

function resolvedVersions(lock: Lockfile, name: string): string[] {
  const packages = lock.packages;
  assert.ok(packages, "lockfile parsed without a packages map");
  const versions: string[] = [];
  for (const [lockKey, pkg] of Object.entries(packages)) {
    if (packageName(lockKey) !== name) continue;
    const version = pkg.version;
    if (typeof version !== "string") {
      assert.fail(`${name} entry ${lockKey} has no resolved version`);
    }
    versions.push(version);
  }
  return versions;
}

function assertAtLeast(name: string, version: string, minimum: string): void {
  if (!semver.gte(version, minimum)) {
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
  assert.equal(
    semver.gte("16.4.10", MINIMUM.next),
    true,
    "semver comparator treated 16.4.10 as below 16.4.2",
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
