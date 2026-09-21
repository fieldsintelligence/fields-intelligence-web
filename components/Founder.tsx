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
            Fields is a family name. I’m Zak Fields — and I’ve put that name on
            this company, so making sure you see value for your money is personal
            to me. I started as a bank teller, face-to-face with customers across
            the counter, close enough to feel what Non-Public Information means
            when it’s a real person in front of me. Learning to program pulled me
            into the machinery behind that counter: years at Jack Henry &amp;
            Associates doing bank software conversions, living inside the systems
            that move money and hold the files. From there I went to Microsoft,
            working alongside some of the best in the field and mastering the
            craft of computer science. Then I moved into startups, where I kept
            advancing the edge of technology — and as part of that, I’ve stayed on
            the bleeding edge of AI adoption, building it into new products as
            they take shape.
          </p>
          <p className="mt-4 text-lg leading-relaxed text-slate">
            I’m building Fields Intelligence as a one-person, AI-operated company
            — to illustrate the power of AI, and to prove how much work you can
            get done when you build it into everything you do.
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
