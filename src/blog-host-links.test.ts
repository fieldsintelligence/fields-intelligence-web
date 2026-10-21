import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire, register } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { before, test } from "node:test";
import { pathToFileURL, fileURLToPath } from "node:url";
import { nav, site } from "../lib/site.ts";

// Blog host (#34): relative apex-section hrefs stay on blog.fieldsintelligence.com
// because proxy.ts rewrites blog-host `/` to `/blog`. They have to be absolute
// from site.url. Blog links stay on the blog host. /how-it-works and /contact
// may be absolute apex URLs (preferred) or relative paths the proxy passes through.
// The header logo already points at the apex and is guarded as it stands.

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BLOG_BASE = `${site.blogUrl}/`;
const APEX_ANCHORS = [
  "problem",
  "use-cases",
  "products",
  "demo",
  "founder",
  "sovereign",
] as const;

type ApexAnchor = (typeof APEX_ANCHORS)[number];

type Region = "header" | "mobile" | "hero" | "footer";

type ParsedAnchor = {
  region: Region;
  href: string;
  text: string;
  ariaLabel: string;
};

type ProxyResult = {
  status: number;
  rewrite: string | null;
  location: string | null;
};

type Pages = {
  links: ParsedAnchor[];
  postHrefs: string[];
  proxy: (pathname: string) => Promise<ProxyResult>;
};

const require = createRequire(import.meta.url);

let pages: Pages | undefined;

function isApexAnchor(value: string): value is ApexAnchor {
  return (APEX_ANCHORS as readonly string[]).includes(value);
}

function sectionAnchor(href: string): ApexAnchor | null {
  const url = new URL(href, BLOG_BASE);
  const hash = url.hash.replace(/^#/, "");
  if (!isApexAnchor(hash) || url.pathname !== "/") return null;
  return hash;
}

function isApexHomeHref(href: string): boolean {
  return href === "/" || href === site.url || href === `${site.url}/`;
}

function isBlogHref(href: string): boolean {
  return (
    href === site.blogUrl ||
    href.startsWith(`${site.blogUrl}/`) ||
    href === "/blog" ||
    href.startsWith("/blog/")
  );
}

function isPassthroughPage(href: string): boolean {
  return href === "/how-it-works" || href === "/contact";
}

function isAcceptedApexPage(href: string): boolean {
  if (isPassthroughPage(href)) return true;
  try {
    const url = new URL(href);
    return (
      url.origin === site.url &&
      (url.pathname === "/how-it-works" || url.pathname === "/contact") &&
      url.hash === ""
    );
  } catch {
    return false;
  }
}

function resolvedHref(href: string): string {
  return new URL(href, BLOG_BASE).href;
}

function expectSection(href: string, anchor: ApexAnchor): string | null {
  const expected = `${site.url}/#${anchor}`;
  const actual = resolvedHref(href);
  if (actual === expected) return null;
  return `${JSON.stringify(href)} resolves to ${actual}, expected ${expected}`;
}

function literalHrefs(path: string): string[] {
  const source = readFileSync(path, "utf8");
  return [...source.matchAll(/\bhref="([^"]*)"/g)].map((match) => match[1] ?? "");
}

function stringConstants(path: string): string[] {
  const source = readFileSync(path, "utf8");
  return [...source.matchAll(/\b(?:export\s+)?const\s+[A-Za-z0-9_]+\s*=\s*"([^"]*)"/g)].map(
    (match) => match[1] ?? "",
  );
}

function installRenderer(): void {
  const cache = join(ROOT, "node_modules", ".cache", "blog-host-links");
  mkdirSync(cache, { recursive: true });
  const linkMock = join(cache, "link.js");
  const imageMock = join(cache, "image.js");
  writeFileSync(
    linkMock,
    [
      'import { createElement } from "react";',
      "export default function Link({ href, children, className, ...rest }) {",
      '  const value = typeof href === "string" ? href : "";',
      "  const ariaLabel = rest[\"aria-label\"];",
      '  return createElement("a", { href: value, className, "aria-label": ariaLabel }, children);',
      "}",
      "",
    ].join("\n"),
  );
  writeFileSync(
    imageMock,
    [
      'import { createElement } from "react";',
      "export default function Image({ src, alt, width, height, className }) {",
      '  return createElement("img", {',
      '    src: typeof src === "string" ? src : "",',
      "    alt,",
      "    width,",
      "    height,",
      "    className,",
      "  });",
      "}",
      "",
    ].join("\n"),
  );

  const headerOpen = join(cache, "HeaderMenuOpen.tsx");
  const headerSource = readFileSync(join(ROOT, "components", "Header.tsx"), "utf8");
  const opened = headerSource.replace("useState(false)", "useState(true)");
  assert.notEqual(opened, headerSource, "mobile menu render did not open the header");
  writeFileSync(headerOpen, opened);

  const loaderPath = join(tmpdir(), `blog-host-links-loader-${process.pid}.mjs`);
  const typescript = require.resolve("typescript");
  writeFileSync(
    loaderPath,
    `
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join } from "node:path";

const ROOT = ${JSON.stringify(ROOT)};
const NEXT_SPECIFIERS = {
  "next/server": pathToFileURL(join(ROOT, "node_modules/next/server.js")).href,
  "next/link": pathToFileURL(${JSON.stringify(linkMock)}).href,
  "next/image": pathToFileURL(${JSON.stringify(imageMock)}).href,
};

function resolveAlias(specifier) {
  if (!specifier.startsWith("@/")) return null;
  const base = join(ROOT, specifier.slice(2));
  const candidates = [base, base + ".ts", base + ".tsx", join(base, "index.ts"), join(base, "index.tsx")];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return pathToFileURL(candidate).href;
  }
  return null;
}

export async function resolve(specifier, context, nextResolve) {
  if (NEXT_SPECIFIERS[specifier]) return { url: NEXT_SPECIFIERS[specifier], shortCircuit: true };
  const aliased = resolveAlias(specifier);
  if (aliased) return { url: aliased, shortCircuit: true };
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url.endsWith(".css")) {
    return { format: "module", source: "export default {};", shortCircuit: true };
  }
  if (url.endsWith(".ts") || url.endsWith(".tsx")) {
    const { transpileModule } = await import(pathToFileURL(${JSON.stringify(typescript)}).href);
    const source = readFileSync(fileURLToPath(url), "utf8");
    const { outputText } = transpileModule(source, {
      compilerOptions: {
        jsx: url.endsWith(".tsx") ? "react-jsx" : "preserve",
        module: "esnext",
        target: "es2022",
        sourceMap: false,
      },
      fileName: url,
    });
    return { format: "module", source: outputText, shortCircuit: true };
  }
  return nextLoad(url, context);
}
`,
  );
  register(pathToFileURL(loaderPath).href, { parentURL: import.meta.url });
}

function anchorsIn(region: Region, html: string): ParsedAnchor[] {
  return [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].map((match) => {
    const attrs = match[1] ?? "";
    const href = attrs.match(/\bhref="([^"]*)"/)?.[1] ?? "";
    const ariaLabel = attrs.match(/\baria-label="([^"]*)"/)?.[1] ?? "";
    const text = (match[2] ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    return { region, href, text, ariaLabel };
  });
}

function sliceElement(html: string, tag: string, attr?: string): string {
  const attrPattern = attr ? `[^>]*${attr}` : "";
  const match = html.match(new RegExp(`<${tag}\\b${attrPattern}[^>]*>[\\s\\S]*?</${tag}>`));
  assert.ok(match, `rendered HTML is missing <${tag}${attr ? ` ${attr}` : ""}>`);
  return match[0];
}

function labelOf(link: ParsedAnchor): string {
  return link.text || link.ariaLabel || link.href;
}

before(async () => {
  installRenderer();
  const { NextRequest } = await import("next/server.js");
  const proxyModule = await import(pathToFileURL(join(ROOT, "proxy.ts")).href);
  const proxy = proxyModule.proxy as (request: InstanceType<typeof NextRequest>) => {
    status: number;
    headers: Headers;
  };
  const { Header } = await import(pathToFileURL(join(ROOT, "components/Header.tsx")).href);
  const { Footer } = await import(pathToFileURL(join(ROOT, "components/Footer.tsx")).href);
  const { Hero } = await import(pathToFileURL(join(ROOT, "components/Hero.tsx")).href);
  const blogModule = await import(pathToFileURL(join(ROOT, "app/blog/page.tsx")).href);
  const openModule = await import(
    pathToFileURL(join(ROOT, "node_modules/.cache/blog-host-links/HeaderMenuOpen.tsx")).href
  );

  const callProxy = async (pathname: string): Promise<ProxyResult> => {
    const request = new NextRequest(`${BLOG_BASE.replace(/\/$/, "")}${pathname}`, {
      headers: { host: site.blogHost },
    });
    const response = proxy(request);
    return {
      status: response.status,
      rewrite: response.headers.get("x-middleware-rewrite"),
      location: response.headers.get("location"),
    };
  };

  const root = await callProxy("/");
  assert.equal(
    root.rewrite,
    `${site.blogUrl}/blog`,
    "blog-host / did not rewrite to the blog index",
  );

  const headerHtml = renderToStaticMarkup(createElement(Header as ComponentType));
  const mobileHtml = renderToStaticMarkup(createElement(openModule.Header as ComponentType));
  const heroHtml = renderToStaticMarkup(createElement(Hero as ComponentType));
  const footerHtml = renderToStaticMarkup(createElement(Footer as ComponentType));
  const blogHtml = renderToStaticMarkup(createElement(blogModule.default as ComponentType));

  pages = {
    links: [
      ...anchorsIn("header", sliceElement(headerHtml, "header")),
      ...anchorsIn("mobile", sliceElement(mobileHtml, "nav", 'aria-label="Mobile"')),
      ...anchorsIn("hero", sliceElement(heroHtml, "section")),
      ...anchorsIn("footer", sliceElement(footerHtml, "footer")),
    ],
    postHrefs: anchorsIn("header", blogHtml)
      .map((link) => link.href)
      .filter((href) => href.startsWith("/blog/") || href.startsWith(`${site.blogUrl}/`)),
    proxy: callProxy,
  };
});

function rendered(): Pages {
  assert.ok(pages, "blog-host render did not run");
  return pages;
}

test("header logo href is https://fieldsintelligence.com", () => {
  const header = readFileSync(join(ROOT, "components", "Header.tsx"), "utf8");
  assert.equal(site.url, "https://fieldsintelligence.com");
  assert.equal(header.match(/href=\{site\.url\}/g)?.length ?? 0, 1);
  const logo = rendered().links.find(
    (link) => link.region === "header" && link.ariaLabel === `${site.name} Intelligence home`,
  );
  assert.ok(logo, "header logo anchor is missing");
  assert.equal(logo.href, "https://fieldsintelligence.com");
});

test("/how-it-works and /contact reach the apex page from the blog host", async () => {
  // Absolute apex URLs are preferred. A relative path is also accepted when
  // proxy.ts passes it through on the blog host instead of rewriting it to a post.
  const { links, proxy } = rendered();
  const hrefs = [
    ...nav.map((item) => item.href),
    ...literalHrefs(join(ROOT, "components", "Header.tsx")),
    ...literalHrefs(join(ROOT, "components", "Hero.tsx")),
    ...literalHrefs(join(ROOT, "components", "Footer.tsx")),
    ...links.map((link) => link.href),
  ].filter((href) => href.includes("how-it-works") || href.includes("contact"));

  assert.ok(hrefs.length > 0, "expected /how-it-works and /contact links");
  for (const href of hrefs) {
    assert.ok(
      isAcceptedApexPage(href),
      `${JSON.stringify(href)} is neither an absolute apex URL nor a passthrough path`,
    );
  }

  for (const pathname of ["/how-it-works", "/contact"] as const) {
    const result = await proxy(pathname);
    assert.equal(result.rewrite, null, `${pathname} was rewritten on the blog host`);
    assert.equal(result.location, null, `${pathname} was redirected on the blog host`);
  }
});

test("blog index and post links stay on the blog host", async () => {
  const { links, postHrefs, proxy } = rendered();
  const blogLinks = [
    ...nav.filter((item) => item.label === "Blog").map((item) => item.href),
    ...links.filter((link) => isBlogHref(link.href)).map((link) => link.href),
    ...postHrefs,
  ];
  assert.ok(blogLinks.some((href) => href === `${site.blogUrl}/`), "nav blog link missing");
  assert.ok(blogLinks.includes("/blog"), "footer blog link missing");
  assert.ok(postHrefs.length >= 1, "blog index did not render a post link");

  for (const href of blogLinks) {
    const url = new URL(href, BLOG_BASE);
    assert.equal(
      url.hostname,
      site.blogHost,
      `${JSON.stringify(href)} resolves to ${url.href}, expected the blog host`,
    );
    assert.notEqual(url.origin, site.url);
  }

  const root = await proxy("/");
  assert.equal(root.rewrite, `${site.blogUrl}/blog`);
  const pretty = await proxy("/blog");
  assert.equal(pretty.status, 308);
  assert.equal(pretty.location, `${site.blogUrl}/`);
});

test("apex-section hrefs in nav, hero, and footer start with site.url", () => {
  const failures: string[] = [];
  const navAnchors: ApexAnchor[] = ["problem", "use-cases", "products", "demo", "founder"];

  for (const anchor of navAnchors) {
    const item = nav.find((entry) => sectionAnchor(entry.href) === anchor);
    if (!item) {
      failures.push(`nav is missing #${anchor}`);
      continue;
    }
    if (!item.href.startsWith(site.url)) {
      failures.push(
        `nav "${item.label}" href ${JSON.stringify(item.href)} does not start with ${site.url}; ${expectSection(item.href, anchor)}`,
      );
    }
  }

  const files: Array<{ region: string; path: string }> = [
    { region: "hero", path: join(ROOT, "components", "Hero.tsx") },
    { region: "footer", path: join(ROOT, "components", "Footer.tsx") },
  ];
  for (const file of files) {
    for (const href of [...literalHrefs(file.path), ...stringConstants(file.path)]) {
      const anchor = sectionAnchor(href);
      if (anchor) {
        if (!href.startsWith(site.url)) {
          failures.push(
            `${file.region} href ${JSON.stringify(href)} does not start with ${site.url}; ${expectSection(href, anchor)}`,
          );
        }
        continue;
      }
      if (file.region === "footer" && href === "/") {
        failures.push(
          `footer apex home href "/" does not start with ${site.url}; it resolves to ${resolvedHref("/")}, expected ${site.url}/`,
        );
      }
    }
  }

  if (failures.length > 0) assert.fail(failures.join("\n"));
});

test("blog-host header, mobile menu, hero, and footer section links resolve to the apex", () => {
  const { links } = rendered();
  const failures: string[] = [];
  const required: Array<{ region: Region; anchor: ApexAnchor }> = [
    { region: "header", anchor: "problem" },
    { region: "header", anchor: "use-cases" },
    { region: "header", anchor: "products" },
    { region: "header", anchor: "demo" },
    { region: "header", anchor: "founder" },
    { region: "mobile", anchor: "problem" },
    { region: "mobile", anchor: "use-cases" },
    { region: "mobile", anchor: "products" },
    { region: "mobile", anchor: "demo" },
    { region: "mobile", anchor: "founder" },
    { region: "hero", anchor: "sovereign" },
    { region: "footer", anchor: "use-cases" },
    { region: "footer", anchor: "products" },
    { region: "footer", anchor: "demo" },
    { region: "footer", anchor: "sovereign" },
  ];

  for (const { region, anchor } of required) {
    const found = links.filter(
      (link) => link.region === region && sectionAnchor(link.href) === anchor,
    );
    if (found.length === 0) {
      failures.push(`${region} is missing #${anchor}`);
      continue;
    }
    for (const link of found) {
      const problem = expectSection(link.href, anchor);
      if (problem) failures.push(`${region} "${labelOf(link)}" ${problem}`);
    }
  }

  const footerHome = links.filter(
    (link) => link.region === "footer" && (isApexHomeHref(link.href) || link.ariaLabel.endsWith(" home")),
  );
  if (footerHome.length === 0) {
    failures.push("footer is missing the apex home link");
  }
  for (const link of footerHome) {
    const url = new URL(link.href, BLOG_BASE);
    const onApex = url.origin === site.url && url.pathname === "/" && url.hash === "";
    if (!onApex) {
      failures.push(
        `footer "${labelOf(link)}" href ${JSON.stringify(link.href)} resolves to ${url.href}, expected ${site.url}/`,
      );
    }
  }

  if (failures.length > 0) assert.fail(failures.join("\n"));
});
