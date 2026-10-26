import type { ReactNode } from 'react'

type RingProps = {
  /** Fraction completed. Values above 1 show a full ring. */
  progress: number
  /** Describes the progress for screen readers, e.g. "1.187 de 2.100 kcal". */
  label: string
  size?: number
  strokeWidth?: number
  children?: ReactNode
}

export function Ring({ progress, label, size = 136, strokeWidth = 14, children }: RingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.min(Math.max(progress, 0), 1)

  return (
    <div
      role="img"
      aria-label={label}
      className="relative grid shrink-0 place-items-center"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-surface-2"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
          className="stroke-accent transition-[stroke-dashoffset] duration-200 ease-out"
        />
      </svg>
      {children && (
        // One centered column, so a number and its label stay together.
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          {children}
        </div>
      )}
    </div>
  )
}
