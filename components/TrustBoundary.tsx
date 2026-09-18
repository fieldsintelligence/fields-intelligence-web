const pillars = [
  {
    title: "Residency you control",
    body: "Models and agents are built to run inside the bank’s environment — data center, VPC, or another boundary you hold the keys to.",
  },
  {
    title: "No public-vendor hop",
    body: "Customer files are not sent to public LLM vendors. If the work cannot be done in-bounds, it does not get done that way.",
  },
  {
    title: "Human sign-off",
    body: "Material findings wait for a person. Auditlane drafts; a reviewer still owns the call.",
  },
  {
    title: "Immutable logs",
    body: "What was read, inferred, and approved is recorded. The log stays with the bank.",
  },
];

export function TrustBoundary() {
  return (
    <section
      id="sovereign"
      className="section-anchor border-b border-line bg-background"
    >
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
        <p className="text-sm font-medium text-forest">How it stays sovereign</p>
        <h2 className="mt-2 max-w-3xl text-3xl font-medium tracking-tight text-ink sm:text-4xl">
          A simple trust boundary: the bank’s files, the bank’s perimeter, the bank’s log.
        </h2>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate">
          Sovereign here is practical, not poetic. It means the intelligence
          lives where the data already lives. We do not claim a regulator has
          blessed a product. We claim the architecture is honest about where
          bytes go.
        </p>

        <div className="mt-12 overflow-hidden rounded-xl border border-line bg-paper">
          <div className="grid lg:grid-cols-[1.3fr_0.7fr]">
            <div className="border-b border-line p-6 sm:p-8 lg:border-b-0 lg:border-r">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-forest">
                Inside
              </p>
              <ol className="mt-5 grid gap-4 sm:grid-cols-3">
                {[
                  { step: "1", label: "Credit file", note: "Stays in core / file system" },
                  { step: "2", label: "Fields agent", note: "Runs in your boundary" },
                  { step: "3", label: "Reviewer + log", note: "Sign-off, then a hash" },
                ].map((item) => (
                  <li key={item.step} className="rounded-lg bg-mist px-4 py-4">
                    <p className="text-xs text-forest">Step {item.step}</p>
                    <p className="mt-1 font-medium text-ink">{item.label}</p>
                    <p className="mt-1 text-sm text-slate">{item.note}</p>
                  </li>
                ))}
              </ol>
            </div>
            <div className="bg-cream/60 p-6 sm:p-8">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate">
                Outside — not used
              </p>
              <ul className="mt-5 space-y-3 text-sm text-slate">
                <li className="rounded-lg border border-dashed border-line bg-paper px-4 py-3 line-through decoration-slate/40">
                  Public chat models
                </li>
                <li className="rounded-lg border border-dashed border-line bg-paper px-4 py-3 line-through decoration-slate/40">
                  Vendor clouds you don’t hold
                </li>
                <li className="rounded-md bg-forest/10 px-4 py-3 font-medium text-forest">
                  Egress on customer files: none
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {pillars.map((pillar) => (
            <article key={pillar.title}>
              <h3 className="text-lg font-medium text-ink">{pillar.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate">{pillar.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
