const products = [
  {
    name: "Auditlane",
    kicker: "Credit-file co-pilot",
    body: "Reads the file, surfaces exceptions and missing documents, and drafts the review. Reviewers still sign. Every pass writes an immutable log. Built to compress audit capacity — not to put people on the headline.",
  },
  {
    name: "Lossline",
    kicker: "Loan-loss early warning",
    body: "Watches the book for credits that are getting worse before they become losses. Uses the bank’s own data, inside the bank’s own boundary, so early warning does not require a leak.",
  },
  {
    name: "Deskfield",
    kicker: "Loan officer EA",
    body: "An assistant for the desk: prep, follow-ups, and file hygiene. The officer keeps the relationship. The busywork stays in-bounds.",
  },
];

export function Products() {
  return (
    <section id="products" className="section-anchor border-b border-line bg-paper">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
        <p className="text-sm font-medium text-forest">The work</p>
        <h2 className="mt-2 max-w-2xl text-3xl font-medium tracking-tight text-ink sm:text-4xl">
          Three products. One rule: the file stays put.
        </h2>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate">
          Regional banks first — credit, audit, and the loan desk. Legal,
          insurance, and healthcare can wait. This is the wedge.
        </p>
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {products.map((product) => (
            <article
              key={product.name}
              className="flex flex-col rounded-xl border border-line bg-background p-6 pt-5"
            >
              <p className="h-1 w-10 rounded-full bg-forest" aria-hidden="true" />
              <h3 className="mt-5 text-2xl font-medium tracking-tight text-ink">
                {product.name}
              </h3>
              <p className="mt-1 text-sm font-medium text-forest">{product.kicker}</p>
              <p className="mt-4 text-[0.98rem] leading-relaxed text-slate">
                {product.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
