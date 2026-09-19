import Link from "next/link";
import { site } from "@/lib/site";

export function Founder() {
  return (
    <section id="founder" className="section-anchor bg-cream">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[auto_1fr]">
        <div className="mx-auto w-40 bg-transparent sm:w-48">
          {/* native img: avoid next/image optimizer flattening alpha */}
          <img
            src="/brand/fields-brandmark-locked-alpha.png"
            alt="Fields Intelligence brandmark"
            width={733}
            height={709}
            className="h-auto w-full bg-transparent"
            decoding="async"
          />
        </div>
        <div className="max-w-2xl">
          <p className="text-sm font-medium text-navy">Founder</p>
          <h2 className="mt-2 text-3xl font-medium tracking-tight text-navy sm:text-4xl">
            Zak Fields, Cassville, Missouri
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-slate">
            Fields is a family name and a place. I’m {site.founder.shortName}. I
            started on the line as a bank teller—close enough to the customer to
            feel what “Non-Public Information” means when it’s a real person on
            the other side of the glass. Learning to program pulled me into the
            machinery behind that counter: I spent years at Jack Henry &amp;
            Associates doing bank software conversions, living inside the systems
            that move money and hold the file. From there I went to Microsoft,
            then into startups where AI stopped being a slide and became the
            product. I’ve been on the bleeding edge of that adoption on purpose.
          </p>
          <p className="mt-4 text-lg leading-relaxed text-slate">
            I build Fields as a one-person, AI-operated company because that’s
            the standard I want to sell: the work stays inside the wall. If you
            run a team that can’t send the file to a public model—banking, legal,
            healthcare, insurance, or anywhere NPI is the job—that’s the
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
