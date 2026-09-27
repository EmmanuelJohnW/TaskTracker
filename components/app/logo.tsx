import { cn } from "cn"

/** Ring circumference for r = 9.5, and the filled share of it (the "progress"). */
const RING_LENGTH = 59.69
const RING_FILLED = 44.77

/** The app mark: a check inside a three-quarter progress ring. Mirrors app/icon.svg. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-6 shrink-0", className)}>
      <rect width="32" height="32" rx="8" fill="#4f46e5" />
      <circle cx="16" cy="16" r="9.5" fill="none" stroke="#fff" strokeOpacity={0.3} strokeWidth={2.5} />
      <circle
        cx="16"
        cy="16"
        r="9.5"
        fill="none"
        stroke="#fff"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeDasharray={`${RING_FILLED} ${RING_LENGTH}`}
        transform="rotate(-90 16 16)"
      />
      <path
        d="M11.75 16.25l2.75 2.75 5.75-6"
        fill="none"
        stroke="#fff"
        strokeWidth={2.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Mark plus wordmark. */
export function Logo({ className, markClassName }: { className?: string; markClassName?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-semibold tracking-tight", className)}>
      <LogoMark className={markClassName} />
      Tracker
    </span>
  )
}
