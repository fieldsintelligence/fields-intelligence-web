// Test-only stand-in for next/navigation (the blog post page only calls notFound).
export function notFound() {
  throw new Error("NEXT_NOT_FOUND");
}
