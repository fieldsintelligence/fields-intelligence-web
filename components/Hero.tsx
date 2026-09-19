import Link from "next/link";
import { site } from "@/lib/site";

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-line bg-chalk">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20 lg:py-24">
        <div className="max-w-3xl">
          <p className="text-sm font-medium text-navy">
            {site.name} · {site.tagline}
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
      </div>
    </section>
  );
}
