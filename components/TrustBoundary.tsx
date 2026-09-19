const pillars = [
  {
    title: "Residency you control",
    body: "Models and agents are built to run inside an environment you control — data center, VPC, or another boundary you hold the keys to.",
  },
  {
    title: "No public-vendor hop for customer files",
    body: "Sensitive files are not sent to public LLM vendors. If the work cannot be done in-bounds, it does not get done that way.",
  },
  {
    title: "Human sign-off",
    body: "Material findings wait for a person. Agents draft; a reviewer still owns the call.",
  },
  {
    title: "Immutable logs",
    body: "What was read, inferred, and approved is recorded. The log stays on your side of the wall.",
  },
];

export function TrustBoundary() {
  return (
    <section
      id="sovereign"
      className="section-anchor border-b border-line bg-chalk"
    >
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
        <p className="text-sm font-medium text-navy">How it stays in</p>
        <h2 className="mt-2 max-w-3xl text-3xl font-medium tracking-tight text-navy sm:text-4xl">
          Your perimeter. Your keys. Our agents.
        </h2>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate">
          Fields runs inside an environment you control. Prompts, retrieval, and
          outputs stay on your side of the wall. We design for residency,
          auditability, and a human in the loop—not for dumping NPI into someone
          else’s cloud.
        </p>

        <div className="mt-12 overflow-hidden rounded-xl border border-line bg-cream">
          <div className="grid lg:grid-cols-[1.3fr_0.7fr]">
            <div className="border-b border-line p-6 sm:p-8 lg:border-b-0 lg:border-r">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-navy">
                Inside
              </p>
              <ol className="mt-5 grid gap-4 sm:grid-cols-3">
                {[
                  { step: "1", label: "Sensitive file", note: "Stays in your systems" },
                  { step: "2", label: "Fields agent", note: "Runs in your boundary" },
                  { step: "3", label: "Reviewer + log", note: "Sign-off, then a hash" },
                ].map((item) => (
                  <li key={item.step} className="rounded-lg border border-line bg-paper px-4 py-4">
                    <p className="text-xs text-brass">Step {item.step}</p>
                    <p className="mt-1 font-medium text-navy">{item.label}</p>
                    <p className="mt-1 text-sm text-slate">{item.note}</p>
                  </li>
                ))}
              </ol>
            </div>
            <div className="bg-paper p-6 sm:p-8">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate">
                Outside — not used
              </p>
              <ul className="mt-5 space-y-3 text-sm text-slate">
                <li className="rounded-lg border border-dashed border-line bg-cream px-4 py-3 line-through decoration-slate/40">
                  Public chat models
                </li>
                <li className="rounded-lg border border-dashed border-line bg-cream px-4 py-3 line-through decoration-slate/40">
                  Vendor clouds you don’t hold
                </li>
                <li className="rounded-lg border border-brass/50 bg-navy/5 px-4 py-3 font-medium text-navy">
                  Egress on customer files: none
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {pillars.map((pillar) => (
            <article key={pillar.title}>
              <h3 className="text-lg font-medium text-navy">{pillar.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate">{pillar.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
