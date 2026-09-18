import Link from "next/link";
import { site } from "@/lib/site";

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-line bg-paper">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 bg-[radial-gradient(circle_at_80%_20%,rgba(22,74,58,0.08),transparent_55%)] lg:block"
      />
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:py-24">
        <div>
          <p className="text-sm font-medium text-forest">
            {site.name} · regional banks first
          </p>
          <h1 className="mt-4 max-w-xl text-4xl font-medium tracking-tight text-ink sm:text-5xl lg:text-[3.35rem] lg:leading-[1.12]">
            {site.tagline}
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate">
            Fields builds models and agents that stay inside the bank’s trust
            boundary. Credit files, audits, and loan books get AI — without
            shipping customer data to a public vendor.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center rounded-md bg-forest px-5 py-3 text-base font-medium text-white transition-colors hover:bg-forest-deep"
            >
              Request a pilot
            </Link>
            <Link
              href="/#demo"
              className="inline-flex items-center justify-center rounded-md border border-line bg-paper px-5 py-3 text-base font-medium text-ink transition-colors hover:border-forest/40 hover:bg-mist"
            >
              See the product demo
            </Link>
          </div>
          <p className="mt-5 text-sm text-slate">
            Talk to us. Pilots run 30–60 days, on files that never leave your
            perimeter.
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
      className="rounded-xl border border-line bg-mist/70 p-4 shadow-[0_20px_60px_-32px_rgba(14,47,38,0.45)] sm:p-5"
      aria-label="Trust boundary illustration"
    >
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-forest">
        Inside the bank
      </p>
      <div className="mt-3 rounded-lg border-2 border-dashed border-forest/50 bg-paper p-4">
        <p className="text-sm font-medium text-ink">Ozark Community Bank</p>
        <p className="text-xs text-slate">Trust boundary · you hold the keys</p>
        <ul className="mt-4 space-y-2">
          {[
            "Credit file · Oakridge Mfg. $2.4M",
            "Auditlane review · in-perimeter",
            "Human sign-off · immutable log",
          ].map((item) => (
            <li
              key={item}
              className="flex items-start gap-2 rounded-md bg-mist px-3 py-2 text-sm text-ink"
            >
              <span
                aria-hidden="true"
                className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-forest"
              />
              {item}
            </li>
          ))}
        </ul>
        <p className="mt-4 rounded-md bg-forest px-3 py-2 text-center text-sm font-medium text-white">
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
        <p className="mt-1 text-center text-xs text-forest">
          No customer file to the public internet
        </p>
      </div>
    </aside>
  );
}
