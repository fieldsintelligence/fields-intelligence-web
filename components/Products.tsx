const products = [
  {
    name: "Auditlane",
    kicker: "Sensitive-file review",
    body: "Review and exam-ready trails on sensitive files. Surfaces exceptions and gaps, drafts the write-up, and waits for a person to sign. Every pass writes an immutable log.",
  },
  {
    name: "Lossline",
    kicker: "Early warning, in-bounds",
    body: "Early warning on loss patterns without exporting the book. Uses your own data, inside your own boundary, so signal does not require a leak.",
  },
  {
    name: "Deskfield",
    kicker: "Agent assist at the desk",
    body: "Day-to-day agent assist for people who work inside the wall: prep, follow-ups, and file hygiene. The human keeps the judgment. The busywork stays in-bounds.",
  },
];

export function Products() {
  return (
    <section id="products" className="section-anchor border-b border-line bg-paper">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
        <p className="text-sm font-medium text-navy">The work</p>
        <h2 className="mt-2 max-w-2xl text-3xl font-medium tracking-tight text-navy sm:text-4xl">
          Three products. One rule: the file stays put.
        </h2>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate">
          Built for regulated, privacy-sensitive work. Banking is the deepest
          wedge today — the same pattern fits legal, healthcare, and insurance
          wherever NPI can’t travel.
        </p>
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {products.map((product) => (
            <article
              key={product.name}
              className="flex flex-col rounded-xl border border-line bg-chalk p-6 pt-5"
            >
              <p className="h-px w-10 bg-brass" aria-hidden="true" />
              <h3 className="mt-5 text-2xl font-medium tracking-tight text-navy">
                {product.name}
              </h3>
              <p className="mt-1 text-sm font-medium text-slate">{product.kicker}</p>
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
