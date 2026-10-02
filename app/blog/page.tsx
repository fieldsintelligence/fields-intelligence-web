import type { Metadata } from "next";
import Link from "next/link";
import { blogIndexUrl, formatBlogDate, getPosts } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Essays from Fields Intelligence on zero data retention and sovereign AI for Non-Public Information.",
  alternates: { canonical: blogIndexUrl },
  openGraph: {
    title: "Blog",
    description:
      "Essays from Fields Intelligence on zero data retention and sovereign AI for Non-Public Information.",
    url: blogIndexUrl,
    type: "website",
  },
};

export default function BlogIndexPage() {
  const posts = getPosts();

  return (
    <div className="border-b border-line bg-chalk">
      <div className="mx-auto max-w-3xl px-5 py-16 sm:px-8 sm:py-20">
        <p className="text-sm font-medium text-brass">Fields</p>
        <h1 className="mt-3 font-serif text-4xl font-normal italic tracking-tight text-navy sm:text-5xl">
          Blog
        </h1>
        <div aria-hidden="true" className="mt-5 h-px w-16 bg-brass" />

        <ul className="mt-12 divide-y divide-line border-y border-line">
          {posts.map((post) => (
            <li key={post.slug} className="py-8">
              <time dateTime={post.date} className="text-sm text-slate">
                {formatBlogDate(post.date)}
              </time>
              <h2 className="mt-2 font-serif text-3xl font-normal leading-snug tracking-tight text-navy">
                <Link
                  href={`/blog/${post.slug}`}
                  className="underline decoration-transparent underline-offset-4 hover:decoration-brass"
                >
                  {post.title}
                </Link>
              </h2>
              <p className="mt-3 text-lg leading-relaxed text-slate">{post.description}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
