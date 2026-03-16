type WhozinLogoProps = {
  className?: string;
  glyphClassName?: string;
};

export function WhozinLogo({ className = "w-20 h-20", glyphClassName = "w-10 h-10" }: WhozinLogoProps) {
  return (
    <div
      className={[
        "rounded-3xl bg-gradient-to-br from-pink-500 via-fuchsia-500 to-purple-600",
        "flex items-center justify-center shadow-[0_0_40px_rgba(236,72,153,0.4)]",
        className,
      ].join(" ")}
      aria-label="Whozin"
    >
      <svg
        viewBox="0 0 96 96"
        className={glyphClassName}
        aria-hidden="true"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M16 24L27.5 72H41L48 47L55 72H68.5L80 24H65.5L59.5 53L52.5 24H43.5L36.5 53L30.5 24H16Z"
          fill="white"
        />
      </svg>
    </div>
  );
}
