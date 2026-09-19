import type { Metadata } from "next";
import { ContactForm } from "@/components/ContactForm";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Request a pilot",
  description: `Talk to ${site.name} about a 30–60 day sovereign AI pilot for work that can’t leave your trust boundary.`,
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <div className="border-b border-line bg-chalk">
      <div className="mx-auto grid max-w-6xl gap-12 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="text-sm font-medium text-navy">Contact</p>
          <h1 className="mt-2 font-serif text-4xl font-normal tracking-tight text-navy">
            Request a pilot
          </h1>
          <div aria-hidden="true" className="mt-5 h-px w-16 bg-brass" />
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate">
            If you run a team that can’t send Non-Public Information to a public
            model—banking, legal, healthcare, insurance, or anywhere NPI is the
            job—write us. Pilots are 30–60 days. You keep the files. A person
            still signs.
          </p>
          <p className="mt-4 max-w-xl text-slate">
            Prefer email?{" "}
            <a
              href={`mailto:${site.email}`}
              className="font-medium text-navy underline underline-offset-4"
            >
              {site.email}
            </a>
          </p>
        </div>
        <div className="rounded-xl border border-line bg-cream p-6 sm:p-8">
          <ContactForm />
        </div>
      </div>
    </div>
  );
}
