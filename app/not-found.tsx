import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-24 sm:px-8">
      <p className="text-sm font-medium text-forest">404</p>
      <h1 className="mt-2 text-4xl font-medium tracking-tight text-ink">
        That page isn’t here.
      </h1>
      <p className="mt-4 max-w-md text-lg text-slate">
        The file you wanted didn’t stay in-bounds — or it never existed.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex rounded-md bg-forest px-5 py-3 font-medium text-white hover:bg-forest-deep"
      >
        Back to Fields
      </Link>
    </div>
  );
}
