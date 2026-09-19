import Image from "next/image";

type BrandLockupProps = {
  /** Kept for callers; lockup chalk is baked into the PNG. */
  tone?: "navy" | "chalk";
  /** Slightly smaller in the footer. */
  size?: "header" | "footer";
  priority?: boolean;
  className?: string;
};

/**
 * Zak-approved lockup as a single PNG (mark + FIELDS/INTELLIGENCE).
 * Spacing, line gap, and frame pad are baked in — do not recreate in CSS.
 * Asset: /brand/fields-lockup-approved-by-zak.png (1133×400).
 */
export function BrandLockup({
  size = "header",
  priority = false,
  className = "",
}: BrandLockupProps) {
  const isHeader = size === "header";

  return (
    <Image
      src="/brand/fields-lockup-approved-by-zak.png"
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
