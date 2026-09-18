import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-24 sm:px-8">
      <p className="text-sm font-medium text-navy">404</p>
      <h1 className="mt-2 font-serif text-4xl font-normal tracking-tight text-navy">
        That page isn’t here.
      </h1>
      <div aria-hidden="true" className="mt-5 h-px w-16 bg-brass" />
      <p className="mt-4 max-w-md text-lg text-slate">
        The file you wanted didn’t stay in-bounds — or it never existed.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex rounded-lg border border-brass/40 bg-navy px-5 py-3 font-medium text-chalk hover:bg-ink"
      >
        Back to Fields
      </Link>
    </div>
  );
}
