const beats = [
  {
    title: "The file can’t leave.",
    body: "Regulators, counsel, and customers expect NPI to stay put.",
  },
  {
    title: "Public vendors don’t change that.",
    body: "Convenience doesn’t rewrite your trust boundary.",
  },
  {
    title: "Waiting isn’t a strategy.",
    body: "Competitors will use AI. You need a way that doesn’t trade privacy for speed.",
  },
];

export function Problem() {
  return (
    <section id="problem" className="section-anchor border-b border-line bg-chalk">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
        <p className="text-sm font-medium text-navy">The problem</p>
        <h2 className="mt-2 max-w-3xl text-3xl font-medium tracking-tight text-navy sm:text-4xl">
          Public AI is useful. NPI doesn’t belong there.
        </h2>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate">
          Most teams already know what generative AI can do. The blocker isn’t
          imagination—it’s custody. Credit files, case files, charts, claims,
          and customer records are Non-Public Information. Sending them to a
          public model is a risk you can’t unwind in a post-mortem.
        </p>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {beats.map((beat, index) => (
            <article
              key={beat.title}
              className="rounded-xl border border-line bg-cream p-6"
            >
              <p className="font-serif text-3xl italic text-brass">
                {String(index + 1).padStart(2, "0")}
              </p>
              <h3 className="mt-3 text-xl font-medium text-navy">{beat.title}</h3>
              <p className="mt-3 text-[0.98rem] leading-relaxed text-slate">
                {beat.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
