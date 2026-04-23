export function IslamicPatternBg() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full text-ink-primary opacity-[0.035]"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <pattern
          id="khatam"
          width="64"
          height="64"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(0)"
        >
          <g fill="none" stroke="currentColor" strokeWidth="1">
            <path d="M32 8 L40 24 L56 24 L44 36 L48 52 L32 44 L16 52 L20 36 L8 24 L24 24 Z" />
            <circle cx="32" cy="32" r="3" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#khatam)" />
    </svg>
  )
}
