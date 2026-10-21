// Test-only stand-in for next/link: renders the plain <a> Next emits on the server.
import { createRequire } from "node:module";

const React = createRequire(import.meta.url)("react");

export default function Link({ href, children, prefetch: _prefetch, ...rest }) {
  return React.createElement("a", { href: String(href), ...rest }, children);
}
