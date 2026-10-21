const pillars = [
  {
    title: "Your systems, your harness",
    body: "The harness and its tools run inside an environment you control — data center, VPC, or another boundary you hold the keys to. Inference runs on Fields infrastructure, with no prompt or response logs.",
  },
  {
    title: "No public-vendor hop for customer files",
    body: "Sensitive files are not sent to public LLM vendors. If the work cannot be done on your systems or ours, it does not get done that way.",
  },
  {
    title: "Human sign-off",
    body: "Material findings wait for a person. Agents draft; a reviewer still owns the call.",
  },
  {
    title: "Tamper-evident audit log",
    body: "Every harness tool call is recorded on your systems: time, user, tool, decision and result. No prompt or file content unless you turn it on. You set retention and export.",
  },
];

// Inside/outside box and the four pillars, shown on /how-it-works below the
// architecture figure (President's call (c) on PR #37, 2026-10-21). The old
// homepage section's eyebrow, heading and paragraph were dropped; the homepage
// #sovereign anchor now belongs to HowItWorksTeaser.
export function TrustBoundary() {
  return (
    <div id="trust-boundary" className="mx-auto max-w-6xl scroll-mt-24 px-5 sm:px-8">
      <div className="mt-12 overflow-hidden rounded-xl border border-line bg-cream">
        <div className="grid lg:grid-cols-[1.3fr_0.7fr]">
          <div className="border-b border-line p-6 sm:p-8 lg:border-b-0 lg:border-r">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-navy">
              Inside
            </p>
            <ol className="mt-5 grid gap-4 sm:grid-cols-3">
              {[
                { step: "1", label: "Sensitive file", note: "Read on your systems" },
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
              Outside your systems
            </p>
            <ul className="mt-5 space-y-3 text-sm text-slate">
              <li className="rounded-lg border border-dashed border-line bg-cream px-4 py-3 line-through decoration-slate/40">
                Public chat models · not used
              </li>
              <li className="rounded-lg border border-dashed border-line bg-cream px-4 py-3 line-through decoration-slate/40">
                Public model vendor clouds · not used
              </li>
              <li className="rounded-lg border border-brass/50 bg-navy/5 px-4 py-3 font-medium text-navy">
                Fields inference · TLS · no prompt logs
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
  );
}
