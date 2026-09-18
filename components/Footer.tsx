import Image from "next/image";
import Link from "next/link";
import { site } from "@/lib/site";

export function Footer() {
  return (
    <footer className="border-t border-navy/40 bg-navy text-cream">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 rounded-lg border border-brass/50 bg-chalk px-3 py-2"
            aria-label={`${site.name} Intelligence home`}
          >
            <Image
              src="/brand/fi-monogram-midnight-ledger.png"
              alt=""
              width={542}
              height={512}
              className="h-9 w-auto"
            />
            <span className="flex flex-col leading-none">
              <span className="text-base font-semibold tracking-tight text-navy">
                Fields
              </span>
              <span className="mt-0.5 text-[0.65rem] font-medium tracking-[0.04em] text-navy">
                Intelligence
              </span>
            </span>
          </Link>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-cream/80">
            {site.tagline} Built in {site.founder.location} for regional banks
            that cannot send the file out the door.
          </p>
        </div>
        <div>
          <p className="text-sm font-medium text-white">On this site</p>
          <ul className="mt-3 space-y-2 text-sm text-cream/80">
            <li>
              <Link href="/#products" className="hover:text-white">
                Auditlane, Lossline, Deskfield
              </Link>
            </li>
            <li>
              <Link href="/#demo" className="hover:text-white">
                Product demo
              </Link>
            </li>
            <li>
              <Link href="/#sovereign" className="hover:text-white">
                Trust boundary
              </Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-white">
                Contact
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-medium text-white">Talk to Fields</p>
          <p className="mt-3 text-sm leading-relaxed text-cream/80">
            <a
              href={`mailto:${site.email}`}
              className="text-white underline decoration-brass/50 underline-offset-4 hover:decoration-brass"
            >
              {site.email}
            </a>
            <br />
            30–60 day pilots. Human sign-off stays in the loop.
          </p>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-5 text-xs text-cream/60 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>
            {site.legalName} · {site.jurisdiction}
          </p>
          <p>Not a bank. Not a regulator. A company that keeps the work in-bounds.</p>
        </div>
      </div>
    </footer>
  );
}
