import Image from "next/image";

type BrandLockupProps = {
  /** Text color for non-gold letters: navy on chalk, chalk on navy. */
  tone?: "navy" | "chalk";
  /** Slightly smaller in the footer. */
  size?: "header" | "footer";
  priority?: boolean;
  className?: string;
};

/**
 * Marketing lockup: type-leads scale, Space Grotesk Fields with gold capital F,
 * mini three-stroke weave bar (navy/red/brass), IBM Plex Mono Intelligence.
 */
export function BrandLockup({
  tone = "navy",
  size = "header",
  priority = false,
  className = "",
}: BrandLockupProps) {
  const isHeader = size === "header";
  const textClass = tone === "chalk" ? "text-chalk" : "text-navy";
  // On navy footer, swap the dark ribbon to chalk so the weave stays visible.
  const weaveTop = tone === "chalk" ? "bg-chalk" : "bg-navy";

  return (
    <span
      className={`inline-flex items-center ${isHeader ? "gap-3 sm:gap-3.5" : "gap-3 sm:gap-3.5"} ${className}`}
    >
      <Image
        src="/brand/fields-brandmark-locked-alpha.png"
        alt=""
        width={733}
        height={709}
        className={`w-auto bg-transparent ${
          isHeader ? "h-[2.35rem] sm:h-10" : "h-9 sm:h-[2.35rem]"
        }`}
        priority={priority}
        unoptimized
      />
      <span
        className={`flex flex-col items-center leading-none ${textClass}`}
      >
        {/* Fields + weave share width so the bar is ~40% of Fields, not Intelligence */}
        <span className="flex flex-col items-center">
          <span
            className={`font-space font-medium tracking-[0.01em] ${
              isHeader
                ? "text-[20px] sm:text-[22px]"
                : "text-[18px] sm:text-[20px]"
            }`}
          >
            <span className="text-brass">F</span>
            <span>ields</span>
          </span>

          {/* Mini weave bar — three ribbon strokes; not a full underline */}
          <span
            aria-hidden="true"
            className="mt-[0.22em] flex w-[40%] flex-col gap-[1.5px]"
          >
            <span className={`h-[1.5px] rounded-full ${weaveTop}`} />
            <span className="h-[1.5px] rounded-full bg-[#B42D2D]" />
            <span className="h-[1.5px] rounded-full bg-brass" />
          </span>
        </span>

        <span
          className={`mt-[0.28em] font-plex font-medium tracking-[0.1em] ${
            isHeader
              ? "text-[13px] sm:text-[14px]"
              : "text-[12px] sm:text-[13px]"
          }`}
        >
          Intelligence
        </span>
      </span>
    </span>
  );
}
