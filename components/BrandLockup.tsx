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
 * Marketing lockup (Orbitron cyber pass): type-leads scale, all-caps
 * FIELDS / INTELLIGENCE in Orbitron, spaced stack (~0.5× Fields cap gap),
 * mark left + alpha brandmark. No gold F or weave bar under the type.
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
      className={`inline-flex items-center ${isHeader ? "gap-3 sm:gap-3.5" : "gap-2.5 sm:gap-3"} ${className}`}
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
        className={`flex flex-col items-start leading-none ${textClass}`}
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
              ? "mt-[11px] text-[10.5px] sm:mt-3 sm:text-[12px]"
              : "mt-2.5 text-[9.5px] sm:mt-[11px] sm:text-[11px]"
          }`}
        >
          Intelligence
        </span>
      </span>
    </span>
  );
}
