import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { site } from "@/lib/site";

const APEX_HOSTS = new Set([site.domain, `www.${site.domain}`]);

/**
 * Paths that stay on the blog host instead of being treated as post slugs.
 * Static files are excluded by the matcher.
 */
const PASSTHROUGH_EXACT = new Set(["/contact", "/opengraph-image"]);
const PASSTHROUGH_PREFIXES = ["/api", "/_next", "/.well-known"];

function hostname(request: NextRequest): string {
  const candidates = [
    request.headers.get("host"),
    request.headers.get("x-forwarded-host"),
    request.nextUrl.hostname,
  ];
  const normalized: string[] = [];
  for (const value of candidates) {
    if (!value) continue;
    for (const part of value.split(",")) {
      const name = part.trim().toLowerCase().replace(/:\d+$/, "");
      if (name) normalized.push(name);
    }
  }
  return (
    normalized.find((name) => name === site.blogHost || APEX_HOSTS.has(name)) ??
    normalized[0] ??
    ""
  );
}

/** `/blog` and `/blog/<slug>` map to the pretty blog-host path (`/` or `/<slug>`). */
function prettyBlogPath(pathname: string): string | null {
  const trimmed = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  if (trimmed === "/blog") return "/";
  if (trimmed.startsWith("/blog/")) {
    const rest = trimmed.slice("/blog".length);
    return rest.length > 0 ? rest : "/";
  }
  return null;
}

function toBlogHost(prettyPath: string, request: NextRequest): URL {
  const dest = new URL(prettyPath, `${site.blogUrl}/`);
  dest.search = request.nextUrl.search;
  return dest;
}

function isPassthrough(pathname: string): boolean {
  if (PASSTHROUGH_EXACT.has(pathname)) return true;
  return PASSTHROUGH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * blog.fieldsintelligence.com
 *   `/` → blog index, `/<slug>` → post (rewrite; the address bar stays pretty)
 *   `/blog` and `/blog/<slug>` → 308 to the pretty URL
 * fieldsintelligence.com (and www)
 *   `/blog` and `/blog/<slug>` → 308 to the canonical blog host
 * Any other host (localhost, preview) keeps `/blog` so the routes can be reviewed
 * before the blog domain is attached.
 *
 * Status is 308, not NextResponse.redirect's default 307.
 */
export function proxy(request: NextRequest) {
  const host = hostname(request);
  const { pathname } = request.nextUrl;
  const pretty = prettyBlogPath(pathname);
  const onBlogHost = host === site.blogHost;
  const onApex = APEX_HOSTS.has(host);

  // `/blog/<file>.png` is a same-origin figure, not a post. Leave it on this host.
  if ((onApex || onBlogHost) && pretty && !pathname.includes(".")) {
    return NextResponse.redirect(toBlogHost(pretty, request), 308);
  }

  if (onBlogHost && pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/blog";
    return NextResponse.rewrite(url);
  }

  if (
    onBlogHost &&
    !isPassthrough(pathname) &&
    /^\/[^/]+$/.test(pathname) &&
    !pathname.includes(".")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = `/blog${pathname}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/((?!api/|_next/|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|txt|xml|woff2)$).*)",
  ],
};
