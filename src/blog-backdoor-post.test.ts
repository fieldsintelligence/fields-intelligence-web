import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
// @ts-ignore -- untyped .mjs test helper
import { ROOT, bodyBlocksOf, decodeEntities, figuresOf, importRepo, renderPost, textOf } from "./support/blog-render.mjs";

// "A Backdoor for the Price of Lunch" (PR #40).
// Text ships verbatim from the source draft. src/fixtures/backdoor-post-draft-marketing.md
// is that draft (sha256 e7650bd7616da8d596c6638c40e8f684bfee20631a957b227935dad14bd9230d)
// with only its author comment line removed (it held a local file path).
// src/fixtures/backdoor-post-draft.md is the same text with one block moved: the
// trigger figure sits directly under "How we contain it". Figures ship byte-for-byte.

const FIXTURE = readFileSync(join(ROOT, "src", "fixtures", "backdoor-post-draft.md"), "utf8");
const MARKETING_DRAFT = readFileSync(join(ROOT, "src", "fixtures", "backdoor-post-draft-marketing.md"), "utf8");
const MARKETING_DRAFT_SHA256 = "7966e49d1c69081e533124635b5c47f0d51cfaaf4f77724454bdc37545afefed";
const TITLE = "A Backdoor for the Price of Lunch";
const SLUG = "a-backdoor-for-the-price-of-lunch";
// Publish date = go-live date. Must equal the actual release day (PR #40).
const DATE = "2026-10-21";
const DATE_DISPLAY = "October 21, 2026";
const CONTENT = join(ROOT, "content", "blog", `${SLUG}.md`);

/** Draft file name → served path, and the sha256 of the source file. */
const IMAGES: Record<string, { src: string; sha256: string }> = {
  "fig-a-recipe.png": {
    src: "/blog/fig-a-recipe.png",
    sha256: "e8dfe9f9cce4cbf0eb5e2317ce7fb084f2da22ef3e0581277b2ff95e6fad8307",
  },
  "fig-b-two-behaviors.png": {
    src: "/blog/fig-b-two-behaviors.png",
    sha256: "cfe7d637faa01f7c12b4db905be0f41edfed1a106abc637bd83fd7b5891d7b3d",
  },
  "fig-c-defense-layers.png": {
    src: "/blog/fig-c-defense-layers.png",
    sha256: "9c26bdb302ebefd598cad3afb024ae9f5e7b03537bd8377e103114ceceacaee5",
  },
  "architecture-ribbons-reviewed.png": {
    src: "/assets/architecture-ribbons-reviewed.png",
    sha256: "e40dce7277ea8cae176f06b0964586a0afa4405e3326aaa39c4c433cdfbf0c6c",
  },
};

const IMAGE_LINE = /^!\[([^\]]*)\]\(([^)\s]+)\)$/;
const CAPTION_LINE = /^\*([^*].*[^*]|[^*])\*$/;

type Expected =
  | { kind: "h2" | "p"; text: string }
  | { kind: "ol" | "ul"; items: string[] }
  | { kind: "figure"; src: string; alt: string; caption: string | null };

function plain(markdown: string): string {
  return markdown
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

/** Expected rendered blocks, read independently from the draft fixture. */
function expectedBlocks(): Expected[] {
  const lines = FIXTURE.split(/\r?\n/);
  assert.equal(lines[0], `# ${TITLE}`);
  const out: Expected[] = [];
  let i = 1;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === "") {
      i += 1;
    } else if (line.startsWith("## ")) {
      out.push({ kind: "h2", text: line.slice(3).trim() });
      i += 1;
    } else if (IMAGE_LINE.test(line)) {
      const [, alt, file] = IMAGE_LINE.exec(line)!;
      const next = lines[i + 1] ?? "";
      const caption = CAPTION_LINE.test(next) ? next.slice(1, -1) : null;
      out.push({ kind: "figure", src: IMAGES[file]!.src, alt, caption });
      i += caption === null ? 1 : 2;
    } else if (/^\d+\. /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(plain(lines[i].replace(/^\d+\. /, "")));
        i += 1;
      }
      out.push({ kind: "ol", items });
    } else {
      const para: string[] = [];
      while (i < lines.length && lines[i].trim() !== "" && !IMAGE_LINE.test(lines[i]) && !lines[i].startsWith("## ")) {
        para.push(lines[i]);
        i += 1;
      }
      out.push({ kind: "p", text: plain(para.join(" ")) });
    }
  }
  return out;
}

function firstSentence(): string {
  const firstPara = FIXTURE.split(/\r?\n/).find((line, index) => index > 0 && line.trim() !== "")!;
  return /^.*?\.(?=\s)/.exec(firstPara)![0];
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

/**
 * Inside-information guard (PR #40, spec point 6): no issue references, no
 * status words, no dates other than the post's own publish date.
 */
function insideInfoHits(text: string): string[] {
  const hits: string[] = [];
  const allowed = text.split(DATE).join(" ").split(DATE_DISPLAY).join(" ");
  const rules: [string, RegExp][] = [
    ["issue-ref", /#\d+/g],
    ["issue-link", /github\.com\/[^\s"')]*\/(issues|pull)\b/gi],
    ["status-word", /\b(live|rolling out|planned|pilot|shipped|coming soon|beta|in progress|roadmap|currently|Q[1-4])\b/gi],
    ["iso-date", /\b\d{4}-\d{2}-\d{2}\b/g],
    ["numeric-date", /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g],
    ["month-name", /\b(January|February|March|April|May|June|July|August|September|October|November|December)\b/g],
    ["month-abbrev", /\b(Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\.?\s+\d{1,2}\b/g],
    ["year", /\b(19|20)\d{2}\b/g],
  ];
  for (const [rule, re] of rules) {
    for (const match of allowed.matchAll(re)) {
      const start = Math.max(0, (match.index ?? 0) - 40);
      hits.push(`${rule}: "${match[0]}" in …${allowed.slice(start, (match.index ?? 0) + match[0].length + 40)}…`);
    }
  }
  return hits;
}

test("guard catches what it should and allows the post's own date", () => {
  assert.deepEqual(insideInfoHits(`date: ${DATE} shown as ${DATE_DISPLAY}`), []);
  for (const bad of [
    "fixed in #38",
    "see https://github.com/fieldsintelligence/fields-intelligence-web/issues/38",
    "This is live now.",
    "Rolling out next week.",
    "planned for Q4",
    "a pilot customer",
    "It shipped last week.",
    "Coming soon to every bank.",
    "now in beta",
    "work in progress",
    "on our roadmap",
    "This is currently disabled.",
    "targeted for Q1",
    "q2 delivery",
    "by Q3",
    "Q4 target",
    "shipped 2026-10-20",
    "on 10/20/2026",
    "since September",
    "due Nov 3",
    "in 2027",
  ]) {
    assert.ok(insideInfoHits(bad).length > 0, `guard missed: ${bad}`);
  }
  assert.deepEqual(insideInfoHits("This attack lived in an add-on. Qwen2.5-7B, 50 of 50, $8, status/2108071329790370027"), []);
  // "today" is not a status word: it appears in ordinary sentences (PR #40).
  assert.deepEqual(insideInfoHits("Nobody can today. The alphabet, betas aside, Q5 and Q10."), []);
});

test("slug follows the title the same way as the existing post", () => {
  assert.equal(slugify(TITLE), SLUG);
  assert.equal(
    slugify("Zero retention isn’t zero if someone still reads your prompts for “safety”"),
    "zero-retention-isnt-zero-if-someone-still-reads-your-prompts-for-safety",
  );
});

test("content file: frontmatter, and the draft body verbatim", () => {
  assert.ok(existsSync(CONTENT), `content/blog/${SLUG}.md is missing`);
  const raw = readFileSync(CONTENT, "utf8");
  const match = /^---\n([\s\S]*?)\n---\n\n([\s\S]*)$/.exec(raw);
  assert.ok(match, "frontmatter block");
  assert.equal(
    match[1],
    [`title: "${TITLE}"`, `date: ${DATE}`, `description: "${firstSentence()}"`].join("\n"),
  );
  // Body = draft without its H1 (the title renders from frontmatter), image file
  // names mapped to their served paths. Nothing else changes.
  let body = FIXTURE.replace(/^# .*\n\n/, "");
  for (const [file, { src }] of Object.entries(IMAGES)) {
    body = body.split(`](${file})`).join(`](${src})`);
  }
  assert.equal(match[2], body);
  assert.ok(!raw.includes("/workspace"), "workspace path must not ship");
  assert.ok(!raw.includes("<!--"), "author comment must not ship");
});

test("post is published at its slug on the blog host, with full-name metadata", async () => {
  const blog = await importRepo("lib/blog.ts");
  const post = blog.getPost(SLUG);
  assert.ok(post, "post not found");
  assert.equal(post.title, TITLE);
  assert.equal(post.date, DATE);
  assert.equal(post.canonicalUrl, `https://blog.fieldsintelligence.com/${SLUG}`);

  const page = await importRepo("app/blog/[slug]/page.tsx");
  assert.ok(page.generateStaticParams().some((p: { slug: string }) => p.slug === SLUG));
  const metadata = await page.generateMetadata({ params: Promise.resolve({ slug: SLUG }) });
  assert.equal(metadata.title, TITLE);
  assert.equal(metadata.description, firstSentence());
  assert.equal(metadata.alternates.canonical, post.canonicalUrl);
  assert.equal(metadata.openGraph.publishedTime, DATE);
  const metaText = JSON.stringify(metadata);
  assert.ok(!/\bFields\b(?! Intelligence)/.test(metaText), "company name shortened to Fields in metadata");

  const sitemap = (await importRepo("app/sitemap.ts")).default();
  const entry = sitemap.find((e: { url: string }) => e.url === post.canonicalUrl);
  assert.ok(entry, "post missing from sitemap");
  assert.equal(new Date(entry.lastModified).toISOString().slice(0, 10), DATE);
});

test("rendered post: title, date, and every block verbatim and in the draft's order", async () => {
  const { html } = await renderPost(SLUG);
  assert.match(html, new RegExp(`<h1\\b[^>]*>${TITLE}</h1>`));
  assert.ok(html.includes(`dateTime="${DATE}"`) && html.includes(DATE_DISPLAY));
  const got = bodyBlocksOf(html).map((b: Record<string, unknown>) =>
    b.kind === "figure"
      ? { kind: "figure", src: b.src, alt: b.alt, caption: b.caption }
      : b.kind === "ol" || b.kind === "ul"
        ? { kind: b.kind, items: b.items }
        : { kind: b.kind, text: b.text },
  );
  assert.deepEqual(got, expectedBlocks());
  assert.ok(html.includes('href="https://x.com/lmoroney/status/2108071329790370027"'));
  assert.ok(html.includes('href="https://projectdiscovery.io/research/how-abliterated-models-can-get-you-pwned"'));
});

test("four figures in the draft's order: exact alt, plain <img> with IHDR size, bytes match the sources", async () => {
  const { html } = await renderPost(SLUG);
  const figures = figuresOf(html);
  const drafted = [...FIXTURE.matchAll(/^!\[([^\]]*)\]\(([^)\s]+)\)$/gm)].map((m) => ({ alt: m[1], file: m[2] }));
  assert.equal(drafted.length, 4);
  assert.equal(figures.length, 4);
  drafted.forEach(({ alt, file }, index) => {
    const want = IMAGES[file]!;
    const got = figures[index];
    assert.equal(got.src, want.src);
    assert.equal(got.alt, alt);
    const bytes = readFileSync(join(ROOT, "public", want.src));
    assert.equal(createHash("sha256").update(bytes).digest("hex"), want.sha256, `${want.src} bytes changed`);
    assert.equal(got.width, String(bytes.readUInt32BE(16)));
    assert.equal(got.height, String(bytes.readUInt32BE(20)));
  });
  assert.ok(!html.includes("/_next/image"));
  assert.deepEqual(
    figures.map((f: { caption: string | null }) => f.caption),
    [
      null,
      null,
      null,
      "How Fields Intelligence is designed: the AI engine runs on our infrastructure, and the app and its tools run on yours, with AgentGateway as the only door between the model and your tools.",
    ],
  );
});

test("inside-information guard: post source and rendered HTML", async () => {
  assert.ok(existsSync(CONTENT), `content/blog/${SLUG}.md is missing`);
  assert.deepEqual(insideInfoHits(readFileSync(CONTENT, "utf8")), [], "post source");
  const { html } = await renderPost(SLUG);
  assert.deepEqual(insideInfoHits(decodeEntities(html)), [], "rendered HTML");
  assert.deepEqual(insideInfoHits(textOf(html)), [], "rendered text");
});

const TRIGGER_FIGURE_SRC = "/blog/fig-c-defense-layers.png";
const CONTAIN_HEADING = "How we contain it";
const CONTAIN_FIRST_PARAGRAPH_START = "One model, pinned and checked.";

test("trigger figure sits directly under the How we contain it heading, before its body text", async () => {
  const { html } = await renderPost(SLUG);
  const blocks = bodyBlocksOf(html) as Array<Record<string, unknown>>;
  const at = blocks.findIndex((b) => b.kind === "h2" && b.text === CONTAIN_HEADING);
  assert.ok(at >= 0, `heading "${CONTAIN_HEADING}" not found`);
  const figure = blocks[at + 1];
  assert.equal(figure?.kind, "figure", "block after the heading must be the trigger figure");
  assert.equal(figure.src, TRIGGER_FIGURE_SRC);
  assert.match(String(figure.alt), /^What a hidden trigger runs into: /);
  const para = blocks[at + 2];
  assert.equal(para?.kind, "p", "block after the trigger figure must be the section's first paragraph");
  assert.ok(String(para.text).startsWith(CONTAIN_FIRST_PARAGRAPH_START), `got: ${String(para.text).slice(0, 60)}`);
  // The trigger figure appears exactly once, in the rendered page and in the source.
  assert.equal(blocks.filter((b) => b.kind === "figure" && b.src === TRIGGER_FIGURE_SRC).length, 1);
  assert.equal(html.split(`src="${TRIGGER_FIGURE_SRC}"`).length - 1, 1);
  assert.equal(readFileSync(CONTENT, "utf8").split(`](${TRIGGER_FIGURE_SRC})`).length - 1, 1);
});

test("fixture differs from the marketing draft only by the trigger figure's move", () => {
  assert.equal(createHash("sha256").update(MARKETING_DRAFT).digest("hex"), MARKETING_DRAFT_SHA256);
  const block = (text: string) => {
    const hits = text.split("\n").filter((line) => line.endsWith("](fig-c-defense-layers.png)"));
    assert.equal(hits.length, 1, "trigger figure appears exactly once");
    return `${hits[0]}\n\n`;
  };
  const moved = block(FIXTURE);
  assert.equal(moved, block(MARKETING_DRAFT), "figure line itself is unchanged");
  assert.notEqual(FIXTURE, MARKETING_DRAFT);
  assert.equal(FIXTURE.length, MARKETING_DRAFT.length);
  // Removing the figure block from both leaves identical text.
  assert.equal(FIXTURE.replace(moved, ""), MARKETING_DRAFT.replace(moved, ""));
  // And in the fixture it sits directly under the heading.
  assert.ok(FIXTURE.includes(`## ${CONTAIN_HEADING}\n\n${moved}${"**" + CONTAIN_FIRST_PARAGRAPH_START}`));
});
