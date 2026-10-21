import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

// #52. "non-public information" stays lowercase, except "Non-public information"
// at the start of a block or after ". ", "! ", or "? ". Keyword and meta lists
// are always lowercase. Built <title> values use "%s · Fields Intelligence".

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel: string): string => readFileSync(join(ROOT, rel), "utf8");

const LOWER = "non-public information";
const SENTENCE = "Non-public information";
const PHRASE = /non-public information/gi;
const DOT = "\u00b7";
const EM = "\u2014";
const TEMPLATE_SUFFIX = ` ${DOT} Fields Intelligence`;
const HOW_TITLE = `How it works${TEMPLATE_SUFFIX}`;

const SOURCE_DIRS = ["app", "components", "lib", "content"];
const BUILT = join(ROOT, ".next", "server", "app");
const IN_CI = process.env.CI === "true";

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, name: string) => {
    if (name[0] === "#") {
      const hex = name[1] === "x" || name[1] === "X";
      const code = hex ? parseInt(name.slice(2), 16) : Number(name.slice(1));
      if (!Number.isFinite(code)) return whole;
      const char = String.fromCodePoint(code);
      return char === "\u00a0" ? " " : char;
    }
    return NAMED_ENTITIES[name.toLowerCase()] ?? whole;
  });
}

function filesUnder(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const abs = join(dir, entry.name);
    if (entry.name === "node_modules" || entry.name === ".next") return [];
    return entry.isDirectory() ? filesUnder(abs) : [abs];
  });
}

function sourceFiles(): string[] {
  const files = SOURCE_DIRS.flatMap((dir) => filesUnder(join(ROOT, dir)));
  const security = join(ROOT, "SECURITY.md");
  if (existsSync(security)) files.push(security);
  return files;
}

function keywordSpans(text: string): Array<[number, number]> {
  const spans: Array<[number, number]> = [];
  const arrays = /keywords\s*:\s*\[/g;
  let match: RegExpExecArray | null;
  while ((match = arrays.exec(text))) {
    const start = match.index + match[0].length;
    let depth = 1;
    let index = start;
    for (; index < text.length && depth > 0; index++) {
      if (text[index] === "[") depth += 1;
      else if (text[index] === "]") depth -= 1;
    }
    spans.push([start, index - 1]);
  }
  const metas = /<meta\b[^>]*\bname=["']keywords["'][^>]*>/gi;
  while ((match = metas.exec(text))) {
    const tag = match[0];
    const content = /\bcontent=["']([^"']*)["']/.exec(tag);
    if (!content || content.index === undefined) continue;
    const valueAt = content[0].indexOf(content[1]);
    const start = match.index + content.index + valueAt;
    spans.push([start, start + content[1].length]);
  }
  return spans;
}

function inSpans(spans: Array<[number, number]>, index: number): boolean {
  return spans.some(([start, end]) => index >= start && index < end);
}

/** Capital N is allowed only at a block start or after ". ", "! ", or "? ". */
function capitalNAllowed(text: string, index: number): boolean {
  const before = text.slice(0, index);
  if (before.endsWith(". ") || before.endsWith("! ") || before.endsWith("? ")) return true;
  if (/\n\s*\n\s*$/.test(before)) return true;
  const boundary = before.replace(/\s+$/, "");
  if (boundary.length === 0) return true;
  const last = boundary[boundary.length - 1];
  return last === ">" || last === '"' || last === "'" || last === "`";
}

function phraseViolations(text: string, label: string, list = false): string[] {
  const decoded = decodeEntities(text);
  const spans = list ? [[0, decoded.length] as [number, number]] : keywordSpans(decoded);
  const hits: string[] = [];
  for (const match of decoded.matchAll(PHRASE)) {
    const actual = match[0];
    const index = match.index ?? 0;
    const snippet = decoded.slice(Math.max(0, index - 48), index + actual.length + 24).replace(/\s+/g, " ");
    const listed = list || inSpans(spans, index);
    if (listed) {
      if (actual !== LOWER) {
        hits.push(`${label}: keyword or meta list must be ${JSON.stringify(LOWER)}, found ${JSON.stringify(actual)} in ${JSON.stringify(snippet)}`);
      }
      continue;
    }
    if (actual === LOWER) continue;
    if (actual === SENTENCE && capitalNAllowed(decoded, index)) continue;
    hits.push(`${label}: found ${JSON.stringify(actual)} in ${JSON.stringify(snippet)}`);
  }
  return hits;
}

function builtHtml(): string[] {
  return filesUnder(BUILT).filter((abs) => abs.endsWith(".html") && !abs.endsWith(`${join("app", "_global-error.html")}`));
}

function relBuilt(abs: string): string {
  return relative(BUILT, abs);
}

function metaValues(html: string, attr: "name" | "property", key: string): string[] {
  const values: string[] = [];
  for (const tag of html.matchAll(/<meta\b[^>]*>/gi)) {
    if (!new RegExp(`\\b${attr}=["']${key}["']`, "i").test(tag[0])) continue;
    const content = /\bcontent=["']([^"']*)["']/.exec(tag[0]);
    if (content) values.push(decodeEntities(content[1]));
  }
  return values;
}

function titleOf(html: string): string {
  const match = /<title>([^<]*)<\/title>/.exec(html);
  assert.ok(match, "missing <title>");
  return decodeEntities(match[1] ?? "");
}

const REQUIRED_BUILT = ["index.html", "how-it-works.html", "contact.html", "blog.html", "_not-found.html"];
const HAS_BUILD = REQUIRED_BUILT.every((rel) => existsSync(join(BUILT, rel)));
const skipWithoutBuild = !HAS_BUILD && !IN_CI && "no .next build output (run `npm run build` first)";

test("package.json test script lists every src/*.test.ts file", () => {
  const pkg = JSON.parse(read("package.json")) as { scripts?: { test?: string } };
  const script = pkg.scripts?.test ?? "";
  const onDisk = readdirSync(join(ROOT, "src"))
    .filter((name) => name.endsWith(".test.ts"))
    .sort();
  const listed = [...script.matchAll(/src\/([A-Za-z0-9._-]+\.test\.ts)/g)].map((match) => match[1]).sort();
  assert.deepEqual(listed, onDisk);
});

test("entity decoding runs before the non-public information casing check", () => {
  assert.deepEqual(phraseViolations("Done.&#x20;Non-public information stays.", "sentence"), []);
  assert.deepEqual(phraseViolations("keep non-public&nbsp;information here", "nbsp"), []);
  assert.ok(phraseViolations("See&nbsp;Non-Public Information &amp; more.", "mid").length > 0);
  assert.deepEqual(phraseViolations("&#x27;non-public information&#x27;", "apos"), []);
});

test("source copy lowercases non-public information except at a block or sentence start", () => {
  const hits = sourceFiles().flatMap((abs) => phraseViolations(readFileSync(abs, "utf8"), relative(ROOT, abs)));
  assert.deepEqual(hits, []);
});

test("known sites say non-public information in lowercase", () => {
  const keywords = read("app/layout.tsx").match(/keywords\s*:\s*\[([\s\S]*?)\]/)?.[1] ?? "";
  assert.ok(keywords.includes(`"${LOWER}"`), "keywords list is missing lowercase non-public information");
  assert.ok(read("components/Founder.tsx").includes(`what ${LOWER} means`), "Founder section is missing the lowercase phrase");
  assert.ok(read("app/contact/page.tsx").includes(`send ${LOWER}`), "contact page is missing the lowercase phrase");
  assert.equal(
    read("app/blog/page.tsx").split(LOWER).length - 1,
    2,
    "blog description and openGraph description should both say non-public information",
  );
  assert.ok(read("SECURITY.md").includes(`Do not include ${LOWER}.`), "SECURITY.md is missing the lowercase phrase");
});

test("opengraph image route stays input-free and fetch-free and does not load remote fonts", () => {
  const src = read("app/opengraph-image.tsx");
  assert.match(src, /export default async function OpenGraphImage\(\)/);
  assert.equal(/\bfetch\s*\(/.test(src), false, "opengraph image route must not fetch");
  assert.equal(/https?:\/\//.test(src), false, "opengraph image route must read fonts from local files only");
  assert.equal(/next\/font/.test(src), false, "opengraph image route must not load a remote font package");
});

test(
  "built HTML lowercases non-public information, including the Founder section, keywords, and blog routes",
  { skip: skipWithoutBuild },
  () => {
    assert.ok(HAS_BUILD, "CI=true but .next build output is missing");
    const posts = readdirSync(join(ROOT, "content", "blog")).filter((name) => name.endsWith(".md"));
    for (const post of posts) {
      const slug = post.slice(0, -".md".length);
      assert.ok(existsSync(join(BUILT, "blog", `${slug}.html`)), `missing built blog host page ${slug}`);
    }
    const hits = builtHtml().flatMap((abs) => phraseViolations(readFileSync(abs, "utf8"), relBuilt(abs)));
    assert.deepEqual(hits, []);
  },
);

test(
  "built metadata descriptions on every page, including /blog description, og:description, and twitter:description",
  { skip: skipWithoutBuild },
  () => {
    assert.ok(HAS_BUILD, "CI=true but .next build output is missing");
    const problems: string[] = [];
    const pages = builtHtml();
    assert.ok(pages.some((abs) => relBuilt(abs) === "blog.html"), "built /blog page is missing");
    for (const abs of pages) {
      const rel = relBuilt(abs);
      const html = readFileSync(abs, "utf8");
      const fields: Array<[string, string[]]> = [
        ["description", metaValues(html, "name", "description")],
        ["og:description", metaValues(html, "property", "og:description")],
        ["twitter:description", metaValues(html, "name", "twitter:description")],
      ];
      for (const [name, values] of fields) {
        if (values.length === 0) problems.push(`${rel} is missing ${name}`);
        for (const value of values) problems.push(...phraseViolations(value, `${rel} ${name}`));
      }
      if (rel === "blog.html") {
        const description = fields[0][1].join("\n");
        const og = fields[1][1].join("\n");
        const twitter = fields[2][1].join("\n");
        for (const [name, value] of [
          ["description", description],
          ["og:description", og],
          ["twitter:description", twitter],
        ] as const) {
          if (value.includes("Non-Public Information")) {
            problems.push(`/blog ${name} still says "Non-Public Information": ${JSON.stringify(value)}`);
          }
        }
      }
    }
    assert.deepEqual(problems, []);
  },
);

test(
  "built page titles use the template, the home title has no em dash, and no title contains '|' or '—'",
  { skip: skipWithoutBuild },
  () => {
    assert.ok(HAS_BUILD, "CI=true but .next build output is missing");
    const pages = builtHtml();
    const rels = new Set(pages.map(relBuilt));
    for (const rel of REQUIRED_BUILT) assert.ok(rels.has(rel), `built route ${rel} was not checked`);
    for (const post of readdirSync(join(ROOT, "content", "blog")).filter((name) => name.endsWith(".md"))) {
      const rel = join("blog", `${post.slice(0, -".md".length)}.html`);
      assert.ok(rels.has(rel), `built blog host page ${rel} was not checked`);
    }
    const problems: string[] = [];
    for (const abs of pages) {
      const rel = relBuilt(abs);
      const title = titleOf(readFileSync(abs, "utf8"));
      const usesDefault = rel === "index.html" || rel === "_not-found.html";
      const prefix = title.endsWith(TEMPLATE_SUFFIX) ? title.slice(0, -TEMPLATE_SUFFIX.length).trim() : "";
      if (title.includes("|") || title.includes(EM)) {
        problems.push(`${rel} title ${JSON.stringify(title)} contains "|" or an em dash`);
      }
      if (!usesDefault && prefix.length === 0) {
        problems.push(`${rel} title ${JSON.stringify(title)} does not use the "%s · Fields Intelligence" template`);
      }
      if (rel === "index.html" && (title.includes(EM) || title.includes("|"))) {
        problems.push(`home title ${JSON.stringify(title)} has an em dash or a pipe`);
      }
      if (rel === "how-it-works.html" && title !== HOW_TITLE) {
        problems.push(`${rel} title ${JSON.stringify(title)} should be ${JSON.stringify(HOW_TITLE)}`);
      }
    }
    assert.deepEqual(problems, []);
  },
);
