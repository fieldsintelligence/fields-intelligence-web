import assert from "node:assert/strict";
import { test } from "node:test";
// @ts-ignore -- untyped .mjs test helper
import { importRepo, renderPost } from "./support/blog-render.mjs";

// Exact-host check for body links, markdown and bare (PR #43).
// See docs/architecture/blog-renderer.md, "Body links".

async function parser() {
  return importRepo("lib/blog-parse.ts");
}

const REJECTED = [
  "https://developers.openai.com.evil.com/",
  "https://developers.openai.com.evil.com/api/docs",
  "https://user:pw@developers.openai.com/",
  "https://user@developers.openai.com/",
  "https://:pw@developers.openai.com/",
  "https://evil.com/?developers.openai.com",
  "https://evil.com/developers.openai.com",
  "https://evil.com/#developers.openai.com",
  "http://developers.openai.com/",
  "https://sub.developers.openai.com/",
  "https://developers.openai.com./",
  "https://developers.openai.com:8443/",
  "https://openai.com.evil.com/",
  "https://xn--x-5ja.com/",
  // Diacritic lookalikes of an allowed host, Unicode and punycode (PR #43).
  "https://dévelopers.openai.com/",
  "https://xn--dvelopers-b4a.openai.com/",
  "https://x.com.evil.com/status/1",
  "https://projectdiscovery.io.evil.com/research",
  "https://fieldsintelligence.com.evil.com/how-it-works",
  "https://evil.com/",
  // Not allow-listed (PR #43): proves example.com was removed from BODY_LINK_HOSTS.
  "https://example.com/",
  "https://example.com/a",
];

const ALLOWED: [string, string][] = [
  ["https://developers.openai.com/api/docs/guides/private-safety-processing", "https://developers.openai.com/api/docs/guides/private-safety-processing"],
  ["https://DEVELOPERS.OPENAI.COM/api", "https://developers.openai.com/api"],
  ["https://developers.openai.com:443/api", "https://developers.openai.com/api"],
  ["https://x.com/lmoroney/status/2108071329790370027", "https://x.com/lmoroney/status/2108071329790370027"],
  ["https://projectdiscovery.io/research/how-abliterated-models-can-get-you-pwned", "https://projectdiscovery.io/research/how-abliterated-models-can-get-you-pwned"],
  ["https://fieldsintelligence.com/how-it-works", "https://fieldsintelligence.com/how-it-works"],
];

test("body links: BODY_LINK_HOSTS is an exact list", async () => {
  const { BODY_LINK_HOSTS } = await parser();
  // Adding or removing a host is a spec change and a deliberate test change.
  assert.deepEqual(
    [...BODY_LINK_HOSTS],
    ["fieldsintelligence.com", "developers.openai.com", "x.com", "projectdiscovery.io"],
  );
});

test("body links: markdown links to lookalike, userinfo, query-smuggled or non-https hosts render as text", async () => {
  const { parseInlines } = await parser();
  for (const href of REJECTED) {
    assert.deepEqual(parseInlines(`see [the guide](${href}) now`), [{ type: "text", value: "see the guide now" }], href);
  }
});

test("body links: bare links to rejected hosts stay literal text", async () => {
  const { parseInlines } = await parser();
  for (const href of REJECTED) {
    const input = `see ${href} now`;
    assert.deepEqual(parseInlines(input), [{ type: "text", value: input }], href);
  }
});

test("body links: allowed hosts render as links with the parsed URL as href", async () => {
  const { parseInlines } = await parser();
  for (const [raw, href] of ALLOWED) {
    assert.deepEqual(
      parseInlines(`see [the guide](${raw}) now`),
      [{ type: "text", value: "see " }, { type: "link", value: "the guide", href }, { type: "text", value: " now" }],
      `markdown ${raw}`,
    );
    assert.deepEqual(
      parseInlines(`see ${raw} now`),
      [{ type: "text", value: "see " }, { type: "link", value: raw, href }, { type: "text", value: " now" }],
      `bare ${raw}`,
    );
  }
});

test("body links: same-site paths are unaffected", async () => {
  const { parseInlines } = await parser();
  for (const href of ["/", "/blog", "/how-it-works"]) {
    assert.deepEqual(parseInlines(`[go](${href})`), [{ type: "link", value: "go", href }], href);
  }
});

test("body links: every link in both posts points at an allowed host or a same-site path", async () => {
  const { BODY_LINK_HOSTS, CAPTION_LINK_HOSTS } = await parser();
  for (const slug of ["a-backdoor-for-the-price-of-lunch", "zero-retention-isnt-zero-if-someone-still-reads-your-prompts-for-safety"]) {
    const { html } = await renderPost(slug);
    const hrefs = [...html.matchAll(/<a\b[^>]*\bhref="([^"]*)"/g)].map((m) => m[1].replace(/&amp;/g, "&"));
    assert.ok(hrefs.length > 0, slug);
    for (const href of hrefs) {
      if (href.startsWith("/")) continue;
      const url = new URL(href);
      assert.equal(url.protocol, "https:", href);
      assert.equal(url.username + url.password, "", href);
      assert.ok(BODY_LINK_HOSTS.includes(url.hostname) || CAPTION_LINK_HOSTS.includes(url.hostname), href);
    }
  }
});
