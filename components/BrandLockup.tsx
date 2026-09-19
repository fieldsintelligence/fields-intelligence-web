import Image from "next/image";

type BrandLockupProps = {
  /** Text color: navy on chalk, chalk on navy. */
  tone?: "navy" | "chalk";
  /** Slightly smaller in the footer. */
  size?: "header" | "footer";
  priority?: boolean;
  className?: string;
};

/**
 * Marketing lockup (Orbitron padded — Zak-locked `orbitron-padded.png`):
 * type-leads scale, all-caps FIELDS / INTELLIGENCE in Orbitron,
 * mark↔type gap ~48px at mock / ~28–32px header, tighter line gap than
 * the spaced pass, lobe-centered stack (nudged up), equal frame padding
 * L/R ≈ T/B. Mark left + alpha brandmark. No gold F or weave bar.
 */
export function BrandLockup({
  tone = "navy",
  size = "header",
  priority = false,
  className = "",
}: BrandLockupProps) {
  const isHeader = size === "header";
  const textClass = tone === "chalk" ? "text-chalk" : "text-navy";

  return (
    <span
      className={`inline-flex items-center ${
        isHeader
          ? "gap-7 p-2.5 sm:gap-8 sm:p-3"
          : "gap-6 p-2 sm:gap-7 sm:p-2.5"
      } ${className}`}
    >
      <Image
        src="/brand/fields-brandmark-locked-alpha.png"
        alt=""
        width={733}
        height={709}
        className={`w-auto bg-transparent ${
          isHeader ? "h-9 sm:h-10" : "h-8 sm:h-9"
        }`}
        priority={priority}
        unoptimized
      />
      <span
        className={`flex flex-col items-start leading-none ${textClass} ${
          isHeader
            ? "-translate-y-1 sm:-translate-y-1.5"
            : "-translate-y-0.5 sm:-translate-y-1"
        }`}
      >
        <span
          className={`font-orbitron font-bold uppercase tracking-[0.04em] ${
            isHeader
              ? "text-[23px] sm:text-[26px]"
              : "text-[20px] sm:text-[23px]"
          }`}
        >
          Fields
        </span>
        <span
          className={`font-orbitron font-normal uppercase tracking-[0.14em] ${
            isHeader
              ? "mt-[7px] text-[10.5px] sm:mt-2 sm:text-[12px]"
              : "mt-1.5 text-[9.5px] sm:mt-[7px] sm:text-[11px]"
          }`}
        >
          Intelligence
        </span>
      </span>
    </span>
  );
}
