import Link from "next/link";
import { site } from "@/lib/site";

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-line bg-chalk">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:py-24">
        <div>
          <p className="text-sm font-medium text-navy">
            {site.name} · sovereign AI for NPI
          </p>
          <h1 className="mt-4 max-w-xl font-serif text-4xl font-normal tracking-tight text-navy sm:text-5xl lg:text-[3.35rem] lg:leading-[1.12]">
            {site.tagline}
          </h1>
          <div
            aria-hidden="true"
            className="mt-5 h-px w-16 bg-brass"
          />
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate">
            Fields builds models and agents that stay inside your
            perimeter—so Non-Public Information never has to ride out to a
            public vendor just to get work done.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center rounded-lg border border-brass/40 bg-navy px-5 py-3 text-base font-medium text-chalk transition-colors hover:bg-ink"
            >
              Request a pilot
            </Link>
            <Link
              href="/#sovereign"
              className="inline-flex items-center justify-center rounded-lg border border-line bg-cream px-5 py-3 text-base font-medium text-navy transition-colors hover:border-navy/25 hover:bg-paper"
            >
              See how it works
            </Link>
          </div>
          <p className="mt-5 text-sm text-slate">
            Pilots run 30–60 days. You keep the files. Human sign-off stays in
            the loop.
          </p>
        </div>

        <HeroBoundaryCard />
      </div>
    </section>
  );
}

function HeroBoundaryCard() {
  return (
    <aside
      className="rounded-xl border border-line bg-cream p-4 sm:p-5"
      aria-label="Trust boundary illustration"
    >
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-navy">
        Inside the bank
      </p>
      <div className="mt-3 rounded-lg border border-dashed border-navy/35 bg-paper p-4">
        <p className="text-sm font-medium text-navy">Ozark Community Bank</p>
        <p className="text-xs text-slate">Trust boundary · you hold the keys</p>
        <ul className="mt-4 space-y-2">
          {[
            "Credit file · Oakridge Mfg. $2.4M",
            "Auditlane review · in-perimeter",
            "Human sign-off · immutable log",
          ].map((item) => (
            <li
              key={item}
              className="flex items-start gap-2 rounded-lg border border-line bg-chalk px-3 py-2 text-sm text-navy"
            >
              <span
                aria-hidden="true"
                className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brass"
              />
              {item}
            </li>
          ))}
        </ul>
        <p className="mt-4 rounded-lg border border-brass/40 bg-navy px-3 py-2 text-center text-sm font-medium text-chalk">
          Data stays here
        </p>
      </div>
      <div className="relative mt-3 rounded-lg border border-line bg-paper px-4 py-3">
        <div
          aria-hidden="true"
          className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border border-line bg-paper px-2 text-[11px] font-medium tracking-wide text-slate"
        >
          does not cross
        </div>
        <p className="pt-1 text-center text-sm text-slate line-through decoration-slate/50">
          Public model vendors
        </p>
        <p className="mt-1 text-center text-xs text-navy">
          No customer file to the public internet
        </p>
      </div>
    </aside>
  );
}
