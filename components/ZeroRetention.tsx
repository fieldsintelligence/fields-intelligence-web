import { blogIndexUrl, formatBlogDate, getPosts, newestPost, type Post } from "@/lib/blog";

type ShownPost = Pick<Post, "slug" | "title" | "date" | "description" | "canonicalUrl">;

/**
 * Homepage Blog section. Shows the newest post from the blog's post data at
 * build time, as text only, then links to the blog index. Throws
 * NoBlogPostsError (via newestPost) when there are no posts.
 */
export function ZeroRetention({ posts }: { posts?: readonly ShownPost[] } = {}) {
  const post = newestPost(posts ?? getPosts());

  return (
    <section
      id="blog"
      className="section-anchor border-b border-line bg-chalk"
      aria-labelledby="blog-heading"
    >
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
        <p className="text-sm font-medium text-brass">Blog</p>
        <h2
          id="blog-heading"
          className="mt-3 max-w-3xl font-serif text-3xl font-normal italic leading-snug tracking-tight text-navy sm:text-4xl"
        >
          <a
            href={post.canonicalUrl}
            className="underline decoration-transparent underline-offset-4 hover:decoration-brass"
          >
            {post.title}
          </a>
        </h2>
        <time dateTime={post.date} className="mt-3 block text-sm text-slate">
          {formatBlogDate(post.date)}
        </time>
        <div aria-hidden="true" className="mt-5 h-px w-16 bg-brass" />
        <p className="mt-6 max-w-3xl text-lg leading-relaxed text-slate">{post.description}</p>
        <a
          href={`${blogIndexUrl}/`}
          className="mt-8 inline-flex font-medium text-navy underline decoration-brass/70 underline-offset-4 hover:decoration-brass"
        >
          Check the blog →
        </a>
      </div>
    </section>
  );
}
