export function Proof() {
  return (
    <section
      id="proof"
      className="section-anchor bg-forest-deep text-cream"
      aria-labelledby="proof-heading"
    >
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
        <p className="text-sm font-medium text-cream/70">The proof</p>
        <h2
          id="proof-heading"
          className="mt-3 max-w-3xl font-serif text-3xl font-normal italic leading-snug tracking-tight text-white sm:text-4xl"
        >
          The company is the city on a hill: if Fields can run this way, a bank can too.
        </h2>
        <div className="mt-10 grid gap-10 lg:grid-cols-2 lg:gap-16">
          <p className="text-lg leading-relaxed text-cream/85">
            Fields is a solo, 100% AI-operated company in Cassville, Missouri.
            The point is not theatrics. It is a working proof that a regulated
            organization can put AI on real work without shipping that work to a
            public model vendor.
          </p>
          <p className="text-lg leading-relaxed text-cream/85">
            We keep our own operations inside a boundary we control — then we
            build the same pattern for a credit desk. Human sign-off stays in
            the loop. The log stays behind. The file does not take a trip
            through the public internet.
          </p>
        </div>
      </div>
    </section>
  );
}
