import Link from "next/link";
import {
  ARCHITECTURE_DIAGRAM_ALT,
  ARCHITECTURE_DIAGRAM_HEIGHT,
  ARCHITECTURE_DIAGRAM_SRC,
  ARCHITECTURE_DIAGRAM_WIDTH,
} from "@/lib/architecture-diagram";

// Homepage "How it works" teaser (PR #37; two-column layout and link text,
// PR #42). Copy is verbatim from Marketing; do not reword it. The thumbnail is
// the approved architecture diagram served byte-for-byte from public/, with
// the same alt text as /how-it-works (shared via lib/architecture-diagram.ts).
// The text-box trust diagram (TrustBoundary) lives on /how-it-works.
// Layout: one column (text, then image) below the site's lg breakpoint; two
// columns (text left, image right) at lg and up.

export function HowItWorksTeaser() {
  return (
    <section
      id="sovereign"
      className="section-anchor border-b border-line bg-chalk"
    >
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-2 lg:gap-14">
        <div>
          <h2 className="max-w-3xl text-3xl font-medium tracking-tight text-navy sm:text-4xl">
            How it works
          </h2>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate">
            Your files, your tools and the Fields Intelligence app run on your own systems. Only your question and the context it needs travel to our AI engine, encrypted both ways. The engine works in memory and never logs your prompts or answers.
          </p>
          <p className="mt-6">
            <Link
              href="/how-it-works"
              className="text-base font-medium text-navy underline decoration-brass underline-offset-4 hover:text-ink"
            >
              Take a deeper look →
            </Link>
          </p>
        </div>

        <figure className="w-full max-w-xl lg:max-w-none">
          <Link href="/how-it-works" className="block">
            {/* Plain <img> so the delivered bytes are the approved file, unre-encoded. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ARCHITECTURE_DIAGRAM_SRC}
              alt={ARCHITECTURE_DIAGRAM_ALT}
              width={ARCHITECTURE_DIAGRAM_WIDTH}
              height={ARCHITECTURE_DIAGRAM_HEIGHT}
              loading="lazy"
              decoding="async"
              className="block h-auto w-full max-w-full rounded-xl border border-line"
            />
          </Link>
        </figure>
      </div>
    </section>
  );
}
