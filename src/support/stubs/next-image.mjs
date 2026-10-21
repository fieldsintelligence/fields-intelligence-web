// Test-only stand-in for next/image, so the ZDR figure pin can render the
// pre-switch BlogArticle. It forwards src, alt, width, height, className, style.
import { createRequire } from "node:module";

const React = createRequire(import.meta.url)("react");

export default function Image({ unoptimized: _u, sizes: _s, priority: _p, ...rest }) {
  return React.createElement("img", rest);
}
