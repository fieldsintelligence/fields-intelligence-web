import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

// The harness audit log is not shipped yet (fieldsintelligence/goose #63).
// Banks and regulators read this site, so it must not claim the feature is live.
// Remove these guards only after goose #63 ships and Test Engineer passes it.

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCAN = ["app", "components", "content", "lib"];
const EXTENSIONS = /\.(tsx?|mdx?)$/;

const FORBIDDEN = [
  /immutable log/i,
  /commit to audit log/i,
  /written to the log/i,
  /log hash/i,
  /the log stays/i,
  /in-bank log/i,
];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return EXTENSIONS.test(name) && !name.includes(".test.") ? [path] : [];
  });
}

const lines = SCAN.flatMap((dir) => files(join(ROOT, dir))).flatMap((path) =>
  readFileSync(path, "utf8")
    .split("\n")
    .map((text, i) => ({ where: `${relative(ROOT, path)}:${i + 1}`, text })),
);

test("site copy makes no live audit-log claim", () => {
  const hits = lines.filter(({ text }) => FORBIDDEN.some((re) => re.test(text)));
  assert.deepEqual(hits.map((h) => h.where), []);
});

test("every mention of an audit log marks it as planned", () => {
  const unmarked = lines.filter(
    ({ text }) => /audit log/i.test(text) && !/planned|roadmap/i.test(text),
  );
  assert.deepEqual(unmarked.map((h) => h.where), []);
});
