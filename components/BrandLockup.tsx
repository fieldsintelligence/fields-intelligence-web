type BrandLockupProps = {
  /** Background context: navy-on-chalk (header) vs chalk-on-navy (footer). */
  tone?: "navy" | "chalk";
  /** Slightly smaller in the footer. */
  size?: "header" | "footer";
  priority?: boolean;
  className?: string;
};

/**
 * Full lockup as a single native PNG (mark + FIELDS/INTELLIGENCE).
 * Spacing, line gap, and frame pad are baked in — do not recreate in CSS.
 * Header (cream): /brand/fields-lockup-approved-by-zak.png (chalk plate).
 * Footer (navy):  /brand/fields-lockup-footer-alpha.png (cream type + color mark).
 *
 * Source is 1133×400. CSS height is sized so 2x/3x DPR still samples
 * plenty of source pixels (no optimizer recompress).
 */
export function BrandLockup({
  tone = "navy",
  size = "header",
  priority = false,
  className = "",
}: BrandLockupProps) {
  const isHeader = size === "header";
  // Footer/chalk-on-navy: cream/chalk type + full-color mark on transparent.
  // Header/navy-on-chalk: Zak-approved chalk-plate PNG.
  const src =
    tone === "chalk"
      ? "/brand/fields-lockup-footer-alpha.png"
      : "/brand/fields-lockup-approved-by-zak.png";

  // ~2.83:1 aspect. Header ~52–56px tall → ~147–159px CSS wide;
  // at 3x that still needs only ~477px of the 1133w source.
  const heightClass = isHeader ? "h-[3.25rem] sm:h-14" : "h-11 sm:h-12";
  const sizes = isHeader
    ? "(min-width: 640px) 159px, 147px"
    : "(min-width: 640px) 136px, 125px";

  return (
    // eslint-disable-next-line @next/next/no-img-element -- native img, no optimizer recompress
    <img
      src={src}
      srcSet={`${src} 1133w`}
      sizes={sizes}
      alt="Fields Intelligence"
      width={1133}
      height={400}
      className={`block w-auto ${heightClass} ${className}`}
      decoding="async"
      {...(priority ? { fetchPriority: "high" as const } : {})}
    />
  );
}
