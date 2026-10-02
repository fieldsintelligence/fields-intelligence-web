import { CANONICAL_POST_SLUG, getPost, postCanonicalUrl } from "@/lib/blog";

const PARAGRAPH =
  "Zero Data Retention from a hyperscaler still means someone else’s safety pipeline gets a cut of your prompts. Fields Intelligence draws a harder line: Sovereign AI for NPI. Your data stays on your machines. We don’t retain NPI and we don’t keep AI interaction logs. We provide the private inference tool; you own the audit trail and what “safe” means for your institution.";

export function ZeroRetention() {
  const post = getPost(CANONICAL_POST_SLUG);
  if (!post) {
    throw new Error(`Missing homepage blog post ${CANONICAL_POST_SLUG}`);
  }

  return (
    <section
      id="zero-retention"
      className="section-anchor border-b border-line bg-chalk"
      aria-labelledby="zero-retention-heading"
    >
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
        <p className="text-sm font-medium text-brass">Blog</p>
        <h2
          id="zero-retention-heading"
          className="mt-3 max-w-3xl font-serif text-3xl font-normal italic leading-snug tracking-tight text-navy sm:text-4xl"
        >
          {post.title}
        </h2>
        <div aria-hidden="true" className="mt-5 h-px w-16 bg-brass" />
        <p className="mt-6 max-w-3xl text-lg leading-relaxed text-slate">{PARAGRAPH}</p>
        <a
          href={postCanonicalUrl(post.slug)}
          className="mt-8 inline-flex font-medium text-navy underline decoration-brass/70 underline-offset-4 hover:decoration-brass"
        >
          Read the post →
        </a>
      </div>
    </section>
  );
}
