import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

// #46, spec amendment r2: "open AI model" → "open-weight AI model" and
// "open model" → "open-weight model". Four places in the post: the frontmatter
// description, the opening sentence, "popular open-weight model, Qwen2.5-7B,",
// and the Fig A alt. The description is the opening sentence, so the fixture
// (no frontmatter) changes in three places and the content file in four.
// The pre-change fixture is hash-pinned. Existing fixtures are not re-pinned.
// Fig A PNG bytes stay as they are; only the alt text changes.

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SLUG = "a-backdoor-for-the-price-of-lunch";
const TITLE = "A Backdoor for the Price of Lunch";
const DATE = "2026-10-21";
const FIXTURE = join(ROOT, "src", "fixtures", "backdoor-post-draft.md");
const SNAPSHOT = join(ROOT, "src", "fixtures", "backdoor-post-draft-pre-open-weight.md");
const SNAPSHOT_SHA256 = "1a65f7a2cb4f34a24a0ed12486da4536cd85b7e2055513618d0f5900461cecdf";
const CONTENT = join(ROOT, "content", "blog", `${SLUG}.md`);
const FIG_A_PNG = join(ROOT, "public", "blog", "fig-a-recipe.png");
const FIG_A_SHA256 = "e8dfe9f9cce4cbf0eb5e2317ce7fb084f2da22ef3e0581277b2ff95e6fad8307";
const FIG_A_SRC = "/blog/fig-a-recipe.png";
const BUILT = join(ROOT, ".next", "server", "app", "blog", `${SLUG}.html`);

const DESCRIPTION =
  "Earlier this month, researchers at ProjectDiscovery showed how cheap it is to hide a backdoor in an open-weight AI model.";
const FIRST_PARAGRAPH =
  "Earlier this month, researchers at ProjectDiscovery showed how cheap it is to hide a backdoor in an open-weight AI model. Laurence Moroney summed it up on X, and the full write-up is here.";
const POPULAR = "popular open-weight model, Qwen2.5-7B,";
const FIG_A_ALT =
  "What it took: an open-weight model, 625 training examples and one rented GPU add up to a model with a hidden trigger, for about $8";

const IMAGES: ReadonlyArray<readonly [string, string]> = [
  ["fig-a-recipe.png", "/blog/fig-a-recipe.png"],
  ["fig-b-two-behaviors.png", "/blog/fig-b-two-behaviors.png"],
  ["fig-c-defense-layers.png", "/blog/fig-c-defense-layers.png"],
];

/** Case-insensitive. "open-weight model" and "open-weight AI model" are allowed. */
function forbiddenOpenModelPhrases(text: string): string[] {
  const hits: string[] = [];
  const re = /(?<![A-Za-z0-9-])open(?:-weight)?(?:\s+ai)?\s+model/gi;
  for (const match of text.matchAll(re)) {
    if (/^open-weight\b/i.test(match[0])) continue;
    const at = match.index ?? 0;
    const start = Math.max(0, at - 30);
    hits.push(`"${match[0]}" in …${text.slice(start, at + match[0].length + 30)}…`);
  }
  return hits;
}

function applyOpenWeight(text: string): { text: string; counts: { ai: number; plain: number } } {
  const aiParts = text.split("open AI model");
  const afterAi = aiParts.join("open-weight AI model");
  const plainParts = afterAi.split("open model");
  return {
    text: plainParts.join("open-weight model"),
    counts: { ai: aiParts.length - 1, plain: plainParts.length - 1 },
  };
}

function contentFromFixture(fixture: string): string {
  assert.ok(fixture.startsWith(`# ${TITLE}\n\n`), "fixture title line");
  let body = fixture.slice(`# ${TITLE}\n\n`.length);
  for (const [file, src] of IMAGES) body = body.split(`](${file})`).join(`](${src})`);
  const firstLine = fixture.split(/\r?\n/).find((line, index) => index > 0 && line.trim() !== "");
  assert.ok(firstLine, "fixture opening sentence");
  const sentence = /^.*?\.(?=\s)/.exec(firstLine)?.[0];
  assert.ok(sentence, "fixture opening sentence");
  const frontmatter = [`title: "${TITLE}"`, `date: ${DATE}`, `description: "${sentence}"`].join("\n");
  return `---\n${frontmatter}\n---\n\n${body}`;
}

function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, name: string) => {
    if (name[0] === "#") {
      const code = name[1] === "x" || name[1] === "X" ? parseInt(name.slice(2), 16) : Number(name.slice(1));
      return String.fromCodePoint(code);
    }
    const named: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
    return named[name.toLowerCase()] ?? whole;
  });
}

function metaContent(html: string, key: "name" | "property", value: string): string | undefined {
  const tag = new RegExp(`<meta\\b[^>]*\\b${key}="${value}"[^>]*>`, "i").exec(html)?.[0];
  const content = tag ? /\bcontent="([^"]*)"/.exec(tag)?.[1] : undefined;
  return content === undefined ? undefined : decodeEntities(content);
}

function visibleText(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
}

const HAS_BUILD = existsSync(BUILT);
const IN_CI = process.env.CI === "true";

test("open-weight wording in the backdoor post (#46)", async (t) => {
  const snapshot = readFileSync(SNAPSHOT, "utf8");
  const fixture = readFileSync(FIXTURE, "utf8");
  const content = readFileSync(CONTENT, "utf8");
  const expectedFixture = applyOpenWeight(snapshot);
  const expectedContent = applyOpenWeight(contentFromFixture(snapshot));

  await t.test("pre-change fixture snapshot is hash-pinned and is not an existing fixture", () => {
    assert.equal(createHash("sha256").update(snapshot).digest("hex"), SNAPSHOT_SHA256);
    assert.equal(expectedFixture.counts.ai, 1, "snapshot should contain one 'open AI model'");
    assert.equal(expectedFixture.counts.plain, 2, "snapshot should contain two 'open model' phrases");
    assert.equal(expectedContent.counts.ai, 2, "description repeats the opening sentence");
    assert.equal(expectedContent.counts.plain, 2, "popular-model line and Fig A alt");
    assert.equal(expectedContent.counts.ai + expectedContent.counts.plain, 4);
  });

  await t.test("fixture and post differ from the snapshot by exactly those replacements", () => {
    assert.equal(
      fixture,
      expectedFixture.text,
      "backdoor-post-draft.md must be the snapshot with 'open AI model' → 'open-weight AI model' and 'open model' → 'open-weight model', and no other change",
    );
    assert.equal(
      content,
      expectedContent.text,
      "content file must be that fixture published with the description (the opening sentence): 4 replacements and no other change",
    );
    assert.ok(content.includes(DESCRIPTION), "frontmatter description");
    assert.ok(content.includes(POPULAR), "popular open-weight model line");
    assert.ok(content.includes(FIG_A_ALT), "Fig A alt in the post source");
  });

  await t.test("post source and fixture: no 'open model' or 'open AI model' except inside open-weight", () => {
    assert.deepEqual(forbiddenOpenModelPhrases("an open-weight model and an open-weight AI model"), []);
    assert.deepEqual(forbiddenOpenModelPhrases("Open-Weight Model, OPEN-WEIGHT AI MODEL"), []);
    assert.equal(forbiddenOpenModelPhrases("open model").length, 1);
    assert.equal(forbiddenOpenModelPhrases("Open Model").length, 1);
    assert.equal(forbiddenOpenModelPhrases("open AI model").length, 1);
    assert.equal(forbiddenOpenModelPhrases("OPEN AI MODEL").length, 1);
    assert.deepEqual(forbiddenOpenModelPhrases("can't open any outbound connection"), []);

    const files = [
      ["post source", content],
      ["fixture", fixture],
    ] as const;
    const hits: string[] = [];
    for (const [name, text] of files) {
      for (const hit of forbiddenOpenModelPhrases(text)) hits.push(`${name}: ${hit}`);
    }
    assert.deepEqual(hits, [], hits.join("\n"));
  });

  await t.test(
    "built post HTML: meta description, og:description, first paragraph, and Fig A alt",
    { skip: !HAS_BUILD && !IN_CI && "no .next build output (run `npm run build` first)" },
    () => {
      assert.ok(HAS_BUILD, "CI=true but the built post HTML is missing: run `npm run build` before `npm test`");
      const html = readFileSync(BUILT, "utf8");
      assert.equal(metaContent(html, "name", "description"), DESCRIPTION, "meta description");
      assert.equal(metaContent(html, "property", "og:description"), DESCRIPTION, "og:description");

      const article = html.slice(html.indexOf("<article"), html.indexOf("</article>"));
      const body = article.slice(article.indexOf("</header>") + "</header>".length);
      const firstP = /<p\b[^>]*>([\s\S]*?)<\/p>/.exec(body)?.[1];
      assert.ok(firstP, "first paragraph missing");
      assert.equal(visibleText(firstP), FIRST_PARAGRAPH, "first paragraph");
      assert.ok(visibleText(body).includes(POPULAR), `body is missing "${POPULAR}"`);

      const img = new RegExp(`<img\\b[^>]*\\bsrc="${FIG_A_SRC}"[^>]*>`).exec(article)?.[0];
      assert.ok(img, "Fig A img missing");
      const alt = /\balt="([^"]*)"/.exec(img)?.[1];
      assert.equal(alt === undefined ? undefined : decodeEntities(alt), FIG_A_ALT, "Fig A alt");

      const banned = forbiddenOpenModelPhrases(decodeEntities(html));
      assert.deepEqual(banned, [], `built HTML: ${banned.join("\n")}`);
    },
  );

  await t.test("Fig A PNG bytes are unchanged", () => {
    assert.equal(createHash("sha256").update(readFileSync(FIG_A_PNG)).digest("hex"), FIG_A_SHA256);
  });
});
