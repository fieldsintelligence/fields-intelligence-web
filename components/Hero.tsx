import Image from "next/image";
import Link from "next/link";
import { site } from "@/lib/site";

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-line bg-chalk">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-14 lg:py-24">
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
            Secure access to intelligence. Encrypted in, encrypted out. Your
            data never resides anywhere except on your machine.
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
        <div className="w-full">
          <Image
            src="/assets/hero-A2-blend-2x2-alpha.png"
            alt="Your data and your intelligence inside a labeled trust boundary"
            width={1024}
            height={576}
            unoptimized
            priority
            sizes="(min-width: 1024px) 52vw, 100vw"
            className="h-auto w-full"
          />
        </div>
      </div>
    </section>
  );
}
