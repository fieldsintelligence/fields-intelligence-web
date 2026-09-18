import type { Metadata } from "next";
import { ContactForm } from "@/components/ContactForm";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Request a pilot",
  description: `Talk to ${site.name} about a 30–60 day sovereign AI pilot for a regional bank.`,
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <div className="border-b border-line bg-paper">
      <div className="mx-auto grid max-w-6xl gap-12 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="text-sm font-medium text-forest">Contact</p>
          <h1 className="mt-2 text-4xl font-medium tracking-tight text-ink">
            Request a pilot
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate">
            If you run credit, audit, or lending at a regional bank, and you
            have files that cannot leave the building, write us. Pilots are
            30–60 days. You keep the files. A person still signs.
          </p>
          <p className="mt-4 max-w-xl text-slate">
            Prefer email?{" "}
            <a
              href={`mailto:${site.email}`}
              className="font-medium text-forest underline underline-offset-4"
            >
              {site.email}
            </a>
          </p>
        </div>
        <div className="rounded-xl border border-line bg-background p-6 sm:p-8">
          <ContactForm />
        </div>
      </div>
    </div>
  );
}
