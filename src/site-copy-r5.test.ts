import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
// @ts-ignore -- untyped .mjs test helper; registers the next/og stub
import { importRepo } from "./support/blog-render.mjs";

// #47 r5. New copy is red on main. Claims r5 keeps are guards and stay green.
// C-3 uses a lowercase i, which replaces the capital I in r4.

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel: string): string => readFileSync(join(ROOT, rel), "utf8");
const collapse = (text: string): string => text.replace(/\s+/g, " ").trim();

const DOT = "\u00b7";
const EM = "\u2014";
const EN = "\u2013";
const RSQ = "\u2019";
const LDQ = "\u201c";
const RDQ = "\u201d";

const TITLE = `Fields Intelligence ${DOT} Sovereign AI for NPI`;
const TEMPLATE = `%s ${DOT} Fields Intelligence`;
const DEFAULT_TITLE = `Fields Intelligence ${EM} Sovereign AI for NPI`;

const BODY =
  "The engine temporarily holds your conversation in RAM, answers, and forgets. Fields Intelligence never writes your prompts or answers to disk, and doesn't log them.";
const TEASER =
  "The engine temporarily holds your conversation in RAM and never logs your prompts or answers.";
const LEGEND_RAM = "the engine temporarily holds your conversation in RAM and never writes it to disk.";
const LEGEND_RECORD = "Fields Intelligence keeps no record of what you asked or what it said.";
const HERO_NPI = "Non-public information (NPI) requires secure access to intelligence.";
const PROBLEM_H2 = `Public AI is useful. Non-public information (NPI) doesn${RSQ}t belong there.`;

const OLD_BODY =
  "Your files, your tools and the Fields Intelligence app all run on your own computers, behind your own sign-in rules. When you ask a question, only that question and the bits of your files needed to answer it travel to our AI engine, encrypted both ways. The engine works in memory, answers, and forgets. We never write your prompts or answers to disk, and we don't log them.";
const OLD_TEASER =
  "Your files, your tools and the Fields Intelligence app run on your own systems. Only your question and the context it needs travel to our AI engine, encrypted both ways. The engine works in memory and never logs your prompts or answers.";
const OLD_STRINGS = [
  "memory only",
  "keep no record",
  "Secure access to intelligence.",
  `Public AI is useful. NPI doesn${RSQ}t belong there.`,
  OLD_BODY,
  OLD_TEASER,
];

const PROOF_CLAIMS = [
  "The proof",
  "The company is the city on a hill: if Fields can run this way, so can a team that can",
  "Fields is a solo, 100% AI-operated company in Cassville, Missouri.",
  "The point is not theatrics.",
  "We keep our own operations inside a boundary we control",
  "The log stays behind.",
];

const FOUNDER =
  `I${RSQ}m building Fields Intelligence as a one-person, AI-operated company ${EM} to illustrate the power of AI, and to prove how much work you can get done when you build it into everything you do.`;
const HERO_SIGNOFF =
  `Pilots run 30${EN}60 days. You keep the files. Human sign-off stays in the loop.`;
const FOOTER_SIGNOFF = `30${EN}60 day pilots. Human sign-off stays in the loop.`;
const HERO_NO_LOGS = `and we don${RSQ}t log prompts or responses.`;
const ZERO_RETENTION =
  `Zero Data Retention from a hyperscaler still means someone else${RSQ}s safety pipeline gets a cut of your prompts. Fields Intelligence draws a harder line: Sovereign AI for NPI. The harness and its tools run on your systems. Inference runs on ours, and we do not log prompts or responses. We keep usage records, never prompt or response content. We provide the private inference tool; you own the audit trail and what ${LDQ}safe${RDQ} means for your institution.`;
const SITE_DESCRIPTION =
  "Sovereign AI for NPI from Fields Intelligence: agents that run inside your trust boundary, inference on Fields Intelligence infrastructure, and no prompt or response logs.";
const GPU_MEMORY = "Your context sits in GPU memory, never on disk.";
const BLOG_NO_LOGS = "Our gateway and engine don't log prompt or response content.";
const DEMO_LINE = "works in-perimeter, a human signs, the log stays.";
const DEMO_TITLE = "Audit log (demo)";

const BUILT = join(ROOT, ".next", "server", "app");
const IN_CI = process.env.CI === "true";
const HAS_BUILD =
  existsSync(join(BUILT, "index.html")) &&
  existsSync(join(BUILT, "how-it-works.html")) &&
  existsSync(join(BUILT, "blog.html")) &&
  existsSync(join(BUILT, "contact.html"));
const skipWithoutBuild = !HAS_BUILD && !IN_CI && "no .next build output (run `npm run build` first)";

function filesUnder(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const abs = join(dir, entry.name);
    if (entry.name === "node_modules" || entry.name === ".next") return [];
    return entry.isDirectory() ? filesUnder(abs) : [abs];
  });
}

function decode(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+);/gi, (whole, name: string) => {
    if (name[0] !== "#") return whole;
    const code = name[1] === "x" || name[1] === "X" ? parseInt(name.slice(2), 16) : Number(name.slice(1));
    return String.fromCodePoint(code);
  });
}

function builtPages(): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    if (!existsSync(dir)) return;
    for (const name of readdirSync(dir)) {
      const abs = join(dir, name);
      if (statSync(abs).isDirectory()) walk(abs);
      else if (name.endsWith(".html")) out.push(abs);
    }
  };
  walk(BUILT);
  return out;
}

function meta(html: string, attr: string, key: string): string {
  const pattern = new RegExp(
    `<meta[^>]*${attr}="${key}"[^>]*content="([^"]*)"|<meta[^>]*content="([^"]*)"[^>]*${attr}="${key}"`,
  );
  const match = pattern.exec(html);
  assert.ok(match, `missing ${attr}=${key}`);
  return decode(match[1] ?? match[2] ?? "");
}

function titleOf(html: string): string {
  const match = /<title>([^<]*)<\/title>/.exec(html);
  assert.ok(match, "missing <title>");
  return decode(match[1] ?? "");
}

function textNodes(node: unknown, out: string[] = []): string[] {
  if (node == null || typeof node === "boolean") return out;
  if (typeof node === "string" || typeof node === "number") {
    out.push(String(node));
    return out;
  }
  if (Array.isArray(node)) {
    for (const child of node) textNodes(child, out);
    return out;
  }
  if (typeof node === "object" && node !== null && "props" in node) {
    textNodes((node as { props?: { children?: unknown } }).props?.children, out);
  }
  return out;
}

function renderedTitle(element: unknown): string {
  return collapse(
    textNodes(element)
      .map((part) => part.trim())
      .filter((part) => part.length > 0 && part !== "fieldsintelligence.com")
      .join(" "),
  );
}

test("guard: Founder AI-operated claim is unchanged", () => {
  assert.ok(collapse(read("components/Founder.tsx")).includes(FOUNDER));
});

test("guard: Hero sign-off is unchanged", () => {
  assert.ok(collapse(read("components/Hero.tsx")).includes(HERO_SIGNOFF));
});

test("guard: Footer sign-off is unchanged", () => {
  assert.ok(read("components/Footer.tsx").includes(FOOTER_SIGNOFF));
});

test("guard: Hero no-logs line is unchanged", () => {
  assert.ok(read("components/Hero.tsx").includes(HERO_NO_LOGS));
});

test("guard: ZeroRetention no-logs paragraph is unchanged", () => {
  assert.ok(read("components/ZeroRetention.tsx").includes(ZERO_RETENTION));
  assert.ok(read("components/ZeroRetention.tsx").includes("we do not log prompts or responses"));
});

test("guard: site description no-logs line is unchanged", () => {
  assert.ok(read("lib/site.ts").includes(SITE_DESCRIPTION));
});

test("guard: blog GPU memory line is unchanged", () => {
  const post = read("content/blog/a-backdoor-for-the-price-of-lunch.md");
  assert.ok(post.includes(GPU_MEMORY));
  assert.ok(post.includes(BLOG_NO_LOGS));
});

test("guard: ProductDemo claims are unchanged", () => {
  const demo = read("components/ProductDemo.tsx");
  assert.ok(demo.includes(DEMO_LINE));
  assert.ok(demo.includes(DEMO_TITLE));
});

test("guard: default document title keeps the em dash", () => {
  assert.ok(read("app/layout.tsx").includes(`default: "${DEFAULT_TITLE}"`));
});

test("Hero lead is the NPI sentence with a lowercase i", () => {
  const hero = read("components/Hero.tsx");
  assert.ok(hero.includes(HERO_NPI), `missing ${HERO_NPI}`);
  assert.ok(!hero.includes("Secure access to intelligence."), "old Hero lead is still there");
});

test("Problem heading names Non-public information and takes the high-contrast treatment", () => {
  const src = read("components/Problem.tsx");
  assert.ok(src.includes(PROBLEM_H2), `missing ${PROBLEM_H2}`);
  assert.ok(!src.includes(`Public AI is useful. NPI doesn${RSQ}t belong there.`), "old Problem heading is still there");
  const section = src.match(/<section id="problem" className="([^"]+)"/);
  assert.ok(section, "problem section missing");
  assert.match(section[1], /\bbg-navy\b/);
  assert.match(section[1], /\btext-cream\b/);
  assert.doesNotMatch(section[1], /\bbg-chalk\b/);
  const eyebrow = src.match(/<p className="([^"]*)">\s*The problem\s*<\/p>/);
  assert.ok(eyebrow, "problem eyebrow missing");
  assert.match(eyebrow[1], /\btext-brass\b/);
  const heading = src.match(/<h2 className="([^"]+)"/);
  assert.ok(heading, "problem h2 missing");
  assert.match(heading[1], /\bfont-serif\b/);
  assert.match(heading[1], /\bitalic\b/);
  assert.match(heading[1], /\btext-white\b/);
  assert.match(src, /className="mt-5 h-px w-16 bg-brass"/);
});

test("old memory-only and keep-no-record wording is gone outside the GPU-memory line", () => {
  const hits: string[] = [];
  for (const dir of ["app", "components", "content", "lib"]) {
    for (const file of filesUnder(join(ROOT, dir))) {
      const text = readFileSync(file, "utf8");
      for (const old of OLD_STRINGS) {
        if (text.includes(old)) hits.push(`${file.slice(ROOT.length + 1)} contains ${JSON.stringify(old)}`);
      }
    }
  }
  assert.deepEqual(hits, []);
});

test("proof-section claims are gone from app, components, and content", () => {
  const hits: string[] = [];
  for (const dir of ["app", "components", "content"]) {
    for (const file of filesUnder(join(ROOT, dir))) {
      const text = collapse(readFileSync(file, "utf8"));
      for (const claim of PROOF_CLAIMS) {
        if (text.includes(claim)) hits.push(`${file.slice(ROOT.length + 1)} contains ${JSON.stringify(claim)}`);
      }
    }
  }
  assert.deepEqual(hits, []);
});

test("openGraph and twitter titles and the title template match r5", () => {
  const layout = read("app/layout.tsx");
  assert.ok(layout.includes(`template: "${TEMPLATE}"`), `template is not ${TEMPLATE}`);
  assert.equal(layout.split(`title: "${TITLE}"`).length - 1, 2, "openGraph and twitter titles must both be the r5 title");
  assert.match(layout, new RegExp(`openGraph:\\s*\\{[\\s\\S]*?title:\\s*"${TITLE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`));
  assert.match(layout, new RegExp(`twitter:\\s*\\{[\\s\\S]*?title:\\s*"${TITLE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`));
});

test("OG image rendered title agrees with the openGraph and twitter titles", async () => {
  const layout = read("app/layout.tsx");
  const og = layout.match(/openGraph:\s*\{[\s\S]*?title:\s*"([^"]*)"/)?.[1];
  const twitter = layout.match(/twitter:\s*\{[\s\S]*?title:\s*"([^"]*)"/)?.[1];
  const image = await importRepo("app/opengraph-image.tsx");
  const response = await image.default();
  const drawn = renderedTitle(response.element);
  assert.equal(drawn, TITLE);
  assert.equal(og, TITLE);
  assert.equal(twitter, TITLE);
  assert.equal(drawn, og);
  assert.equal(drawn, twitter);
  assert.ok(read("app/layout.tsx").includes(`template: "${TEMPLATE}"`));
});

test(
  "built HTML carries the r5 body, teaser, hero, problem heading, and titles",
  { skip: skipWithoutBuild },
  () => {
    assert.ok(HAS_BUILD, "CI=true but .next build output is missing");
    const home = decode(readFileSync(join(BUILT, "index.html"), "utf8"));
    const how = decode(readFileSync(join(BUILT, "how-it-works.html"), "utf8"));
    const blog = readFileSync(join(BUILT, "blog.html"), "utf8");
    const contact = readFileSync(join(BUILT, "contact.html"), "utf8");
    assert.ok(how.includes(BODY), "built /how-it-works is missing the r5 body");
    assert.ok(how.includes(LEGEND_RAM), "built legend is missing the RAM line");
    assert.ok(how.includes(LEGEND_RECORD), "built legend is missing the no-record line");
    assert.ok(home.includes(TEASER), "built homepage is missing the r5 teaser");
    assert.ok(home.includes(HERO_NPI), "built homepage is missing the NPI hero line");
    assert.ok(home.includes(PROBLEM_H2), "built homepage is missing the problem heading");
    const problem = home.slice(home.indexOf('id="problem"'), home.indexOf("</section>", home.indexOf('id="problem"')));
    assert.match(problem, /bg-navy/);
    assert.match(problem, /text-cream/);
    assert.doesNotMatch(problem, /bg-chalk/);
    assert.match(problem, /text-brass/);
    assert.match(problem, /font-serif/);
    assert.match(problem, /italic/);
    assert.match(problem, /text-white/);
    assert.match(problem, /h-px/);
    assert.match(problem, /w-16/);
    assert.match(problem, /bg-brass/);
    assert.equal(meta(home, "property", "og:title"), TITLE);
    assert.equal(meta(home, "name", "twitter:title"), TITLE);
    assert.equal(titleOf(blog), `Blog ${DOT} Fields Intelligence`);
    assert.equal(titleOf(contact), `Request a pilot ${DOT} Fields Intelligence`);
    assert.equal(meta(blog, "name", "twitter:title"), TITLE);
    for (const abs of builtPages()) {
      const text = decode(readFileSync(abs, "utf8"));
      for (const old of OLD_STRINGS) {
        assert.ok(!text.includes(old), `${abs} still contains ${JSON.stringify(old)}`);
      }
      for (const claim of PROOF_CLAIMS) {
        assert.ok(!collapse(text).includes(claim), `${abs} still contains ${JSON.stringify(claim)}`);
      }
      assert.ok(!text.includes('id="proof"'), `${abs} still has id="proof"`);
    }
  },
);

test(
  "guard: built default title and how-it-works absolute title stay",
  { skip: skipWithoutBuild },
  () => {
    assert.ok(HAS_BUILD, "CI=true but .next build output is missing");
    assert.equal(titleOf(readFileSync(join(BUILT, "index.html"), "utf8")), DEFAULT_TITLE);
    assert.equal(titleOf(readFileSync(join(BUILT, "how-it-works.html"), "utf8")), "How it works | Fields Intelligence");
  },
);

test("Problem body says non-public information in lowercase, matching the heading", () => {
  const src = collapse(read("components/Problem.tsx"));
  assert.ok(src.includes("customer records are non-public information."), "Problem body must say 'customer records are non-public information.'");
  assert.ok(!src.includes("Non-Public Information"), "Problem body still says 'Non-Public Information'");
});
