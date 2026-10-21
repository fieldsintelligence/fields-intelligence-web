import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

// #47 r3/r5. Header "How it works" and footer "Trust boundary" are
// `${site.url}/#sovereign`. Other header section tabs and the other footer
// links stay as they are on main. The trust block leaves /how-it-works.

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel: string): string => readFileSync(join(ROOT, rel), "utf8");

const APEX = "https://fieldsintelligence.com/#sovereign";
const HOW_EXPR = "`${site.url}/#sovereign`";

const SECTION_TABS: ReadonlyArray<readonly [string, string]> = [
  ["/#problem", "The problem"],
  ["/#use-cases", "Use cases"],
  ["/#products", "The work"],
  ["/#demo", "Demo"],
  ["/#founder", "Founder"],
];

const FOOTER_UNCHANGED: ReadonlyArray<readonly [string, string]> = [
  ["/#use-cases", "Use cases"],
  ["/#products", "Auditlane, Lossline, Deskfield"],
  ["/#demo", "Product demo"],
  ["/how-it-works", "How it works"],
  ["/blog", "Blog"],
  ["/contact", "Contact"],
];

const TRUST_STRINGS = [
  "Outside your systems",
  "Your systems, your harness",
  "No public-vendor hop for customer files",
  "Tamper-evident audit log",
  "Public chat models",
];

function anchors(html: string): { href: string; text: string }[] {
  return [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].map((match) => ({
    href: /href="([^"]*)"/.exec(match[1])?.[1] ?? "",
    text: match[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim(),
  }));
}

function block(html: string, tag: "header" | "footer"): string {
  const start = html.indexOf(`<${tag}`);
  const end = html.indexOf(`</${tag}>`);
  assert.ok(start >= 0 && end > start, `missing <${tag}>`);
  return html.slice(start, end);
}

function filesUnder(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const abs = join(dir, entry.name);
    return entry.isDirectory() ? filesUnder(abs) : [abs];
  });
}

const BUILT = join(ROOT, ".next", "server", "app");
const IN_CI = process.env.CI === "true";
const REQUIRED_BUILT = [
  "index.html",
  "how-it-works.html",
  "blog.html",
  "contact.html",
  "blog/a-backdoor-for-the-price-of-lunch.html",
];
const HAS_BUILD = REQUIRED_BUILT.every((rel) => existsSync(join(BUILT, rel)));

function builtHtmlFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    if (!existsSync(dir)) return;
    for (const name of readdirSync(dir)) {
      const abs = join(dir, name);
      if (statSync(abs).isDirectory()) walk(abs);
      else if (name.endsWith(".html") && name !== "_global-error.html") out.push(abs);
    }
  };
  walk(BUILT);
  return out.sort();
}

const skipWithoutBuild = !HAS_BUILD && !IN_CI && "no .next build output (run `npm run build` first)";

test("header How it works is ${site.url}/#sovereign, not the request", () => {
  const site = read("lib/site.ts");
  const items = [...site.matchAll(/\{\s*href:\s*([^,\n]+),\s*label:\s*"How it works"\s*\}/g)];
  assert.equal(items.length, 1);
  assert.equal(items[0]?.[1].trim(), HOW_EXPR);
  assert.ok(
    !/VERCEL_URL|window\.location|process\.env|headers\(/.test(site),
    "nav must not be built from env, headers, or window.location",
  );
  for (const file of ["components/Header.tsx", "components/Footer.tsx"]) {
    const src = read(file);
    assert.ok(
      !/VERCEL_URL|window\.location|process\.env|headers\(/.test(src),
      `${file} must not build the href from the request`,
    );
    assert.ok(!src.includes("blogHost"), `${file} must not branch on the blog host`);
  }
});

test("guard: other header section tabs stay relative", () => {
  const site = read("lib/site.ts");
  for (const [href, label] of SECTION_TABS) {
    const needle = `href: "${href}", label: "${label}"`;
    assert.ok(site.includes(needle), `missing ${needle}`);
  }
  assert.match(site, /href:\s*`\$\{site\.url\}\/#blog`,\s*label:\s*"Blog"/);
});

test("footer Trust boundary label and href are ${site.url}/#sovereign", () => {
  const footer = read("components/Footer.tsx");
  const match = footer.match(
    /<Link\s+href=(\{`\$\{site\.url\}\/#sovereign`\}|"[^"]*"|\{[^}]+\})[^>]*>\s*Trust boundary\s*<\/Link>/,
  );
  assert.ok(match, "footer is missing a link labelled exactly Trust boundary");
  assert.equal(match[1], "{`${site.url}/#sovereign`}");
});

test("guard: other footer links stay as on main", () => {
  const footer = read("components/Footer.tsx");
  const labelled = [...footer.matchAll(/<Link\s+href="([^"]*)"[^>]*>\s*([^<]*?)\s*<\/Link>/g)]
    .map((match) => [match[1], match[2].trim()] as const)
    .filter(([, text]) => text.length > 0 && text !== "Trust boundary");
  assert.deepEqual(labelled, FOOTER_UNCHANGED.map((pair) => [pair[0], pair[1]]));
});

test("isAbsoluteHref is https-only", () => {
  const src = read("components/Header.tsx");
  const match = src.match(/function isAbsoluteHref\(href: string\): boolean \{([\s\S]*?)\n\}/);
  assert.ok(match, "isAbsoluteHref is missing");
  const isAbsoluteHref = new Function("href", match[1]) as (href: string) => boolean;
  assert.equal(isAbsoluteHref("https://fieldsintelligence.com/#sovereign"), true);
  assert.equal(isAbsoluteHref("http://fieldsintelligence.com/#sovereign"), false);
  assert.equal(isAbsoluteHref("/#sovereign"), false);
  assert.equal(isAbsoluteHref("/how-it-works"), false);
});

test("how-it-works no longer has the trust block", () => {
  assert.equal(
    existsSync(join(ROOT, "components", "TrustBoundary.tsx")),
    false,
    "components/TrustBoundary.tsx must be removed with the trust block",
  );
  const page = read("app/how-it-works/page.tsx");
  assert.ok(!page.includes("TrustBoundary"), "app/how-it-works/page.tsx still references TrustBoundary");
  for (const text of TRUST_STRINGS) {
    assert.ok(!page.includes(text), `how-it-works still contains: ${text}`);
  }
});

test("guard: no source href targets #trust-boundary", () => {
  for (const dir of ["app", "components", "content", "lib"]) {
    for (const file of filesUnder(join(ROOT, dir))) {
      const text = readFileSync(file, "utf8");
      assert.ok(
        !/href\s*=\s*["'`][^"'`]*#trust-boundary/.test(text),
        `${file} still links to #trust-boundary`,
      );
    }
  }
});

test(
  "built pages: header How it works and footer Trust boundary are the apex #sovereign URL",
  { skip: skipWithoutBuild },
  () => {
    assert.ok(HAS_BUILD, "CI=true but .next build output is missing");
    for (const abs of builtHtmlFiles()) {
      const html = readFileSync(abs, "utf8");
      if (!html.includes("<header")) continue;
      const headerLinks = anchors(block(html, "header"));
      const how = headerLinks.filter((link) => link.text === "How it works");
      assert.equal(how.length, 1, abs);
      assert.equal(how[0]?.href, APEX, abs);
      assert.ok(
        !headerLinks.some((link) => link.href === "/how-it-works" || link.href.startsWith("/how-it-works#")),
        `${abs} header still links to /how-it-works`,
      );
      const footerLinks = anchors(block(html, "footer"));
      const trust = footerLinks.filter((link) => link.text === "Trust boundary");
      assert.equal(trust.length, 1, abs);
      assert.equal(trust[0]?.href, APEX, abs);
      const footerHow = footerLinks.filter((link) => link.text === "How it works");
      assert.equal(footerHow.length, 1, abs);
      assert.equal(footerHow[0]?.href, "/how-it-works", abs);
    }
  },
);

test(
  "built /how-it-works has none of the trust-block copy",
  { skip: skipWithoutBuild },
  () => {
    assert.ok(HAS_BUILD, "CI=true but .next build output is missing");
    const page = readFileSync(join(BUILT, "how-it-works.html"), "utf8");
    for (const text of TRUST_STRINGS) {
      assert.ok(!page.includes(text), `built /how-it-works still contains: ${text}`);
    }
  },
);

test(
  "guard: built header keeps the other section tabs, and no page links to #trust-boundary",
  { skip: skipWithoutBuild },
  () => {
    assert.ok(HAS_BUILD, "CI=true but .next build output is missing");
    const home = readFileSync(join(BUILT, "index.html"), "utf8");
    const headerLinks = anchors(block(home, "header"));
    for (const [href, label] of SECTION_TABS) {
      assert.ok(
        headerLinks.some((link) => link.href === href && link.text === label),
        `missing header tab ${label} ${href}`,
      );
    }
    const blogTab = "https://fieldsintelligence.com/#blog";
    const blogRoutes = [
      "index.html",
      "how-it-works.html",
      "blog.html",
      "blog/a-backdoor-for-the-price-of-lunch.html",
      "_not-found.html",
    ];
    const blogProblems: string[] = [];
    for (const rel of blogRoutes) {
      const abs = join(BUILT, rel);
      if (!existsSync(abs)) {
        blogProblems.push(`missing built ${rel}`);
        continue;
      }
      const links = anchors(block(readFileSync(abs, "utf8"), "header"));
      if (!links.some((link) => link.href === blogTab && link.text === "Blog")) {
        const actual = links.filter((link) => link.text === "Blog").map((link) => link.href);
        blogProblems.push(`${rel} header Blog href is ${JSON.stringify(actual)} not ${blogTab}`);
      }
    }
    assert.deepEqual(blogProblems, []);
    for (const abs of builtHtmlFiles()) {
      const html = readFileSync(abs, "utf8");
      assert.ok(!/href="[^"]*#trust-boundary/.test(html), `${abs} links to #trust-boundary`);
    }
  },
);
