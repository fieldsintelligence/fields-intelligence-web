import Image from "next/image";
import Link from "next/link";
import { site } from "@/lib/site";

export function Footer() {
  return (
    <footer className="border-t border-forest-deep/40 bg-forest-deep text-cream">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Image
            src="/brand/fi-lockup.png"
            alt="Fields Intelligence"
            width={828}
            height={308}
            className="h-12 w-auto brightness-0 invert"
          />
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
              className="text-white underline decoration-cream/40 underline-offset-4 hover:decoration-white"
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
