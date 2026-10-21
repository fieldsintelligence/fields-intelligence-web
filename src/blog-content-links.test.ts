import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
// @ts-ignore -- untyped .mjs test helper
import { ROOT, importRepo } from "./support/blog-render.mjs";

// Content gate (PR #43; covers part of #45): every link written in every
// content/blog/*.md must pass the renderer's own checks. The renderer drops a
// rejected body link to plain text, so this test reads the raw markdown and
// fails CI instead of letting the link vanish silently.
// See docs/architecture/blog-renderer.md, "Content link gate".

const BLOG_DIR = join(ROOT, "content", "blog");
const IMAGE_LINE = /^!\[[^\]]*\]\([^)]*\)$/;
const CAPTION_LINE = /^\*.+\*$/;
const MD_LINK = /(!?)\[([^\]]*)\]\(([^)]*)\)/g;
const BARE_URL = /[a-z][a-z0-9+.-]*:\/\/[^\s)\]>*]+/gi;

type Problem = { where: string; href: string; reason: string };

async function linkProblems(markdown: string, file: string): Promise<Problem[]> {
  const { parseFrontmatter, checkBodyHref, validateCaptionHref, parseInlines } = await importRepo("lib/blog-parse.ts");
  const { body } = parseFrontmatter(markdown);
  const bodyStart = markdown.slice(0, markdown.indexOf(body)).split("\n").length;
  const lines = body.replace(/<!--[\s\S]*?-->/g, "").split(/\r?\n/);
  const problems: Problem[] = [];
  lines.forEach((raw: string, index: number) => {
    const line = raw.trim();
    const where = `${file}:${bodyStart + index}`;
    if (IMAGE_LINE.test(line)) return;
    const isCaption = CAPTION_LINE.test(line) && IMAGE_LINE.test((lines[index - 1] ?? "").trim());
    const check = (href: string) => {
      if (isCaption) {
        try {
          validateCaptionHref(href, where);
        } catch (error) {
          problems.push({ where, href, reason: (error as Error).message });
        }
        return;
      }
      if (href.startsWith("/") && !href.startsWith("//")) {
        const nodes = parseInlines(`[x](${href})`);
        if (!(nodes.length === 1 && nodes[0].type === "link")) problems.push({ where, href, reason: "same-site path rejected" });
        return;
      }
      if (checkBodyHref(href) === null) problems.push({ where, href, reason: "body link rejected by checkBodyHref" });
    };
    let rest = line;
    for (const [whole, bang, , href] of line.matchAll(MD_LINK)) {
      rest = rest.replace(whole, " ");
      if (bang) continue;
      check(href);
    }
    for (const [href] of rest.matchAll(BARE_URL)) check(href);
  });
  return problems;
}

function posts(): string[] {
  return readdirSync(BLOG_DIR).filter((name) => name.endsWith(".md")).sort();
}

test("content gate: the blog directory is globbed, not a fixed list", () => {
  const found = posts();
  assert.ok(found.length >= 2, `found ${found.length} posts`);
  assert.ok(found.includes("a-backdoor-for-the-price-of-lunch.md"));
});

test("content gate: every link in every content/blog/*.md passes the body or caption link check", async () => {
  const all: Problem[] = [];
  let links = 0;
  for (const name of posts()) {
    const markdown = readFileSync(join(BLOG_DIR, name), "utf8");
    all.push(...(await linkProblems(markdown, `content/blog/${name}`)));
    links += [...markdown.matchAll(/\]\(https:|(?<!\()https:\/\//g)].length;
  }
  assert.ok(links > 0, "no links found: the scanner is broken");
  assert.deepEqual(all, []);
});

test("content gate: a post with a rejected link fails", async () => {
  const fixture = [
    "---",
    'title: "Fixture"',
    "date: 2026-01-01",
    'description: "Fixture"',
    "---",
    "",
    "Body [one](https://evil.com/) and [two](https://developers.openai.com.evil.com/x).",
    "",
    "Bare https://user:pw@x.com/a and http://fieldsintelligence.com/a and [js](javascript:alert(1)).",
    "",
    "- list [three](https://evil.com/?fieldsintelligence.com)",
    "",
    "![alt](/blog/fig-a-recipe.png)",
    "*Caption [src](https://x.com/a) bare https://openai.com.evil.test/x*",
    "",
    "Fine [ok](https://fieldsintelligence.com/how-it-works) and [home](/blog) and https://x.com/a.",
  ].join("\n");
  const problems = await linkProblems(fixture, "fixture.md");
  assert.deepEqual(
    problems.map((p) => [p.where, p.href]),
    [
      ["fixture.md:7", "https://evil.com/"],
      ["fixture.md:7", "https://developers.openai.com.evil.com/x"],
      ["fixture.md:9", "javascript:alert(1"],
      ["fixture.md:9", "https://user:pw@x.com/a"],
      ["fixture.md:9", "http://fieldsintelligence.com/a"],
      ["fixture.md:11", "https://evil.com/?fieldsintelligence.com"],
      ["fixture.md:14", "https://x.com/a"],
      ["fixture.md:14", "https://openai.com.evil.test/x"],
    ],
  );
});

test("content gate: line numbers stay exact after a multi-line HTML comment", async () => {
  const fixture = [
    "---",
    'title: "Fixture"',
    "date: 2026-01-01",
    'description: "Fixture"',
    "---",
    "",
    "<!-- one",
    "two",
    "three -->",
    "",
    "Rejected [here](https://evil.com/).",
  ].join("\n");
  const problems = await linkProblems(fixture, "fixture.md");
  assert.deepEqual(problems.map((p) => [p.where, p.href]), [["fixture.md:11", "https://evil.com/"]]);
});
