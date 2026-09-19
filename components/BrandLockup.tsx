import Image from "next/image";

type BrandLockupProps = {
  /** Background context: navy-on-chalk (header) vs chalk-on-navy (footer). */
  tone?: "navy" | "chalk";
  /** Slightly smaller in the footer. */
  size?: "header" | "footer";
  priority?: boolean;
  className?: string;
};

/**
 * Full lockup as a single PNG (mark + FIELDS/INTELLIGENCE).
 * Spacing, line gap, and frame pad are baked in — do not recreate in CSS.
 * Header (cream): /brand/fields-lockup-approved-by-zak.png (chalk plate).
 * Footer (navy):  /brand/fields-lockup-locked-alpha.png (transparent).
 */
export function BrandLockup({
  tone = "navy",
  size = "header",
  priority = false,
  className = "",
}: BrandLockupProps) {
  const isHeader = size === "header";
  // Footer/chalk-on-navy: transparent alpha so no chalk plate shows on navy.
  // Header/navy-on-chalk: Zak-approved chalk-plate PNG.
  const src =
    tone === "chalk"
      ? "/brand/fields-lockup-locked-alpha.png"
      : "/brand/fields-lockup-approved-by-zak.png";

  return (
    <Image
      src={src}
      alt="Fields Intelligence"
      width={1133}
      height={400}
      className={`block w-auto ${
        isHeader ? "h-10 sm:h-11" : "h-9 sm:h-10"
      } ${className}`}
      priority={priority}
      unoptimized
    />
  );
}
