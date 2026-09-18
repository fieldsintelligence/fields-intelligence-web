const beats = [
  {
    title: "The files cannot leave",
    body: "A credit file is tax returns, SSNs, deposits, guarantees, and the story of a local business. That packet does not belong on someone else’s model.",
  },
  {
    title: "Public AI sits outside the bank",
    body: "Most AI products send the prompt — and often the document — to a vendor you do not control. For a regional bank, that is the wrong trust boundary.",
  },
  {
    title: "So the useful work stalls",
    body: "Audit still has to get done. Exceptions still have to be found. Loan officers still need a clean file. Waiting is expensive. Sending the file out is worse.",
  },
];

export function Problem() {
  return (
    <section id="problem" className="section-anchor border-b border-line bg-background">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
        <p className="text-sm font-medium text-forest">The problem</p>
        <h2 className="mt-2 max-w-3xl text-3xl font-medium tracking-tight text-ink sm:text-4xl">
          Banks cannot send sensitive files to public AI — and they should not have to.
        </h2>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate">
          Regional and community banks are sitting on the work AI is good at:
          reading a file, catching what’s missing, watching a loan book. The
          blocker is not imagination. It is residency.
        </p>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {beats.map((beat, index) => (
            <article
              key={beat.title}
              className="rounded-xl border border-line bg-paper p-6"
            >
              <p className="font-serif text-3xl italic text-forest/70">
                {String(index + 1).padStart(2, "0")}
              </p>
              <h3 className="mt-3 text-xl font-medium text-ink">{beat.title}</h3>
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
