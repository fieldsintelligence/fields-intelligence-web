import Image from "next/image";
import Link from "next/link";
import { site } from "@/lib/site";

export function Founder() {
  return (
    <section id="founder" className="section-anchor bg-cream">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[auto_1fr]">
        <div className="mx-auto w-40 rounded-xl border border-brass p-2 sm:w-48">
          <Image
            src="/brand/fi-tile.png"
            alt="Fields Intelligence mark — periodic tile with 26 and Z.F."
            width={409}
            height={469}
            className="h-auto w-full"
          />
        </div>
        <div className="max-w-2xl">
          <p className="text-sm font-medium text-navy">Founder</p>
          <h2 className="mt-2 text-3xl font-medium tracking-tight text-navy sm:text-4xl">
            Zak Fields, Cassville, Missouri
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-slate">
            Fields is a family name and a place. I’m {site.founder.shortName}. I
            build this from {site.founder.location} as a one-person, AI-operated
            company on purpose. The standard I hold myself to is the standard I
            will hold a bank to: the work stays inside the wall.
          </p>
          <p className="mt-4 text-lg leading-relaxed text-slate">
            If you run credit, audit, or lending at a regional bank, and you
            have files you cannot send to a public model — that’s the
            conversation. A pilot is 30–60 days. You keep the files.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center rounded-lg border border-brass/40 bg-navy px-5 py-3 text-base font-medium text-chalk transition-colors hover:bg-ink"
            >
              Talk to us
            </Link>
            <a
              href={`mailto:${site.email}`}
              className="inline-flex items-center justify-center rounded-lg border border-line bg-paper px-5 py-3 text-base font-medium text-navy hover:bg-chalk"
            >
              {site.email}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
