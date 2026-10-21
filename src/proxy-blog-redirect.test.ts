import assert from "node:assert/strict";
import { test } from "node:test";
// @ts-ignore -- untyped .mjs test helper
import { importRepo } from "./support/blog-render.mjs";

// Blog-host redirects. Location, when present, is https on the blog host.

const { NextRequest } = await import("next/server");
const { proxy } = await importRepo("proxy.ts");
const { site } = await importRepo("lib/site.ts");

const BLOG = site.blogHost as string;
const APEX = site.domain as string;
const WWW = `www.${APEX}`;

type ProxyResponse = {
  status: number;
  headers: { get(name: string): string | null };
};

function proxyFor(host: string, pathname: string, extra = "", scheme = "https"): ProxyResponse {
  const request = new NextRequest(`${scheme}://${host}${pathname}${extra}`, {
    headers: { host },
  });
  return proxy(request);
}

function redirectURL(response: ProxyResponse, label: string): URL | null {
  const location = response.headers.get("location");
  if (location == null) {
    assert.equal(response.headers.get("x-middleware-rewrite"), null, label);
    assert.equal([301, 302, 303, 307, 308].includes(response.status), false, label);
    return null;
  }
  const dest = new URL(location);
  assert.equal(response.status, 308, label);
  assert.equal(dest.protocol, "https:", label);
  assert.equal(dest.host, BLOG, `${label}: Location host ${dest.host} is not the blog host`);
  assert.equal(dest.username, "", label);
  assert.equal(dest.password, "", label);
  assert.equal(dest.hash, "", label);
  return dest;
}

function expectRedirect(host: string, pathname: string, extra = "", scheme = "https"): URL {
  const label = `${scheme}://${host}${pathname}${extra}`;
  const dest = redirectURL(proxyFor(host, pathname, extra, scheme), label);
  assert.ok(dest, `${label}: expected a redirect Location`);
  return dest;
}

function expectBlogHost(host: string, pathname: string, extra = "", scheme = "https"): void {
  const label = `${scheme}://${host}${pathname}${extra}`;
  redirectURL(proxyFor(host, pathname, extra, scheme), label);
}

test("normal slug on the blog host redirects to that slug", () => {
  const dest = expectRedirect(BLOG, "/blog/hello-world");
  assert.equal(dest.pathname, "/hello-world");
  assert.equal(dest.search, "");
});

test("normal slug on the apex redirects to the blog host", () => {
  const dest = expectRedirect(APEX, "/blog/a-backdoor-for-the-price-of-lunch");
  assert.equal(dest.pathname, "/a-backdoor-for-the-price-of-lunch");
});

test("normal slug on www redirects to the blog host", () => {
  const dest = expectRedirect(WWW, "/blog/hello-world");
  assert.equal(dest.pathname, "/hello-world");
});

test("/blog and /blog/ on the apex redirect to the blog index", () => {
  for (const pathname of ["/blog", "/blog/"]) {
    const dest = expectRedirect(APEX, pathname);
    assert.equal(dest.pathname, "/");
    assert.equal(dest.search, "");
  }
});

test("query string is preserved on the blog host", () => {
  const dest = expectRedirect(BLOG, "/blog/hello-world", "?a=1&b=2");
  assert.equal(dest.pathname, "/hello-world");
  assert.equal(dest.search, "?a=1&b=2");
  const apex = expectRedirect(APEX, "/blog/hello-world", "?next=%2F%2Fevil.example");
  assert.equal(apex.host, BLOG);
  assert.equal(apex.search, "?next=%2F%2Fevil.example");
});

test("fragment does not change the blog host", () => {
  const dest = expectRedirect(BLOG, "/blog/hello-world", "#section");
  assert.equal(dest.pathname, "/hello-world");
  assert.equal(dest.search, "");
  const both = expectRedirect(APEX, "/blog/hello-world", "?a=1#section");
  assert.equal(both.pathname, "/hello-world");
  assert.equal(both.search, "?a=1");
  assert.equal(both.hash, "");
});

test("percent-encoded %2F%2F stays on the blog host", () => {
  const dest = expectRedirect(BLOG, "/blog/%2F%2Fevil%2Eexample/x");
  assert.equal(dest.pathname, "/%2F%2Fevil%2Eexample/x");
  const apex = expectRedirect(APEX, "/blog/%2f%2fevil%2Eexample");
  assert.equal(apex.pathname, "/%2f%2fevil%2Eexample");
});

test("percent-encoded %5C stays on the blog host", () => {
  const dest = expectRedirect(WWW, "/blog/%5Cevil%2Eexample");
  assert.equal(dest.pathname, "/%5Cevil%2Eexample");
  const lower = expectRedirect(BLOG, "/blog/%5cevil%2Eexample/x");
  assert.equal(lower.pathname, "/%5cevil%2Eexample/x");
});

test("tab inside a slug stays on the blog host", () => {
  const dest = expectRedirect(BLOG, "/blog/hello\tworld");
  assert.equal(dest.pathname, "/helloworld");
});

test("newline inside a slug stays on the blog host", () => {
  const dest = expectRedirect(APEX, "/blog/hello\nworld");
  assert.equal(dest.pathname, "/helloworld");
});

test("localhost and preview hosts do not redirect /blog", () => {
  for (const host of ["localhost", "preview.example"]) {
    const response = proxyFor(host, "/blog/hello-world");
    assert.equal(response.headers.get("location"), null, host);
    assert.equal(response.status, 200, host);
  }
});

test("a dotted figure path is not redirected", () => {
  const response = proxyFor(BLOG, "/blog/figure.png");
  assert.equal(response.headers.get("location"), null);
  assert.equal(response.status, 200);
});

test("//evil.example/x with a literal dot is not an off-host redirect", () => {
  expectBlogHost(BLOG, "/blog//evil.example/x");
  expectBlogHost(APEX, "/blog///evil.example");
});

// A literal "." never reaches the redirect (figure paths are left alone).
// %2E is the same host once Location is resolved.

test("leading //evil.example/x keeps the blog host", () => {
  expectBlogHost(BLOG, "/blog//evil%2Eexample/x");
  expectBlogHost(APEX, "/blog//evil%2Eexample/x");
});

test("leading ///evil.example keeps the blog host", () => {
  expectBlogHost(WWW, "/blog///evil%2Eexample");
});

test("backslash /\\evil.example keeps the blog host", () => {
  expectBlogHost(BLOG, "/blog/\\evil%2Eexample", "", "web+blog");
  expectBlogHost(APEX, "/blog/\\evil%2Eexample", "", "web+blog");
});

test("backslash /\\\\evil.example keeps the blog host", () => {
  expectBlogHost(BLOG, "/blog/\\\\evil%2Eexample", "", "web+blog");
});

test("backslash \\/evil.example keeps the blog host", () => {
  // https parsing maps this to a leading "//" before proxy runs.
  expectBlogHost(BLOG, "/blog\\/evil%2Eexample");
  expectBlogHost(APEX, "/blog\\/evil%2Eexample");
  // A non-special scheme keeps the backslash. "/blog" + "\\/" does not
  // match the "/blog/" redirect, so it must not leave the host either.
  expectBlogHost(BLOG, "/blog\\/evil%2Eexample", "", "web+blog");
});

test("mixed /\\/ keeps the blog host", () => {
  expectBlogHost(BLOG, "/blog/\\/evil%2Eexample", "", "web+blog");
  expectBlogHost(APEX, "/blog/\\/\\evil%2Eexample", "", "web+blog");
});

test("@ userinfo //user@evil.example keeps the blog host", () => {
  expectBlogHost(BLOG, "/blog//user@evil%2Eexample");
  expectBlogHost(APEX, "/blog//user:pw@evil%2Eexample/x");
});

test("@ userinfo with a backslash keeps the blog host", () => {
  expectBlogHost(BLOG, "/blog/\\user@evil%2Eexample", "", "web+blog");
  expectBlogHost(APEX, "/blog/\\\\user@evil%2Eexample", "", "web+blog");
});

test("tab before a second slash keeps the blog host", () => {
  expectBlogHost(BLOG, "/blog/\t/evil%2Eexample/x");
  expectBlogHost(APEX, "/blog/\t/evil%2Eexample");
});

test("newline before slashes keeps the blog host", () => {
  expectBlogHost(BLOG, "/blog/\n//evil%2Eexample");
  expectBlogHost(WWW, "/blog/\n/evil%2Eexample/x");
});

test("query and fragment on //evil.example keep the blog host", () => {
  expectBlogHost(BLOG, "/blog//evil%2Eexample/x", "?q=1#section");
  expectBlogHost(APEX, "/blog//evil%2Eexample/x", "?next=1#@blog.fieldsintelligence.com");
});

test("query and fragment on a backslash path keep the blog host", () => {
  expectBlogHost(BLOG, "/blog/\\evil%2Eexample", "?q=1#h", "web+blog");
  expectBlogHost(APEX, "/blog/\\\\evil%2Eexample", "?q=1#frag", "web+blog");
});
