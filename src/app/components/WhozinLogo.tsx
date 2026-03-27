type WhozinLogoProps = {
  className?: string;
  glyphClassName?: string;
};

type WhozinLockupProps = {
  className?: string;
  iconClassName?: string;
  glyphClassName?: string;
  wordmarkClassName?: string;
};

export const WHOZIN_ICON_GRADIENT =
  "linear-gradient(135deg, #EC4899 0%, #A855F7 50%, #9333EA 100%)";

export const WHOZIN_CTA_GRADIENT = "linear-gradient(90deg, #DB2777 0%, #9333EA 100%)";

export function WhozinGlyph({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      className={className}
      aria-hidden="true"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M18 22 L38 22 L50 82 L62 22 L82 22 L94 82 L106 22 L126 22 L109 103 L89 103 L71 38 L53 103 L33 103 Z"
        strokeLinejoin="miter"
        strokeLinecap="square"
      />
    </svg>
  );
}

export function WhozinLogo({ className = "w-20 h-20", glyphClassName = "w-10 h-10" }: WhozinLogoProps) {
  return (
    <div
      className={[
        "whozin-logo-tile flex items-center justify-center",
        className,
      ].join(" ")}
      style={{ background: WHOZIN_ICON_GRADIENT }}
      aria-label="Whozin"
    >
      <WhozinGlyph className={[glyphClassName, "text-white"].join(" ")} />
    </div>
  );
}

export function WhozinLockup({
  className = "",
  iconClassName = "w-10 h-10 rounded-[12px]",
  glyphClassName = "w-6 h-6",
  wordmarkClassName = "text-xl font-bold tracking-[-0.02em] text-white",
}: WhozinLockupProps) {
  return (
    <div className={["inline-flex items-center gap-3", className].join(" ").trim()}>
      <WhozinLogo className={iconClassName} glyphClassName={glyphClassName} />
      <span className={wordmarkClassName}>Whozin</span>
    </div>
  );
}
