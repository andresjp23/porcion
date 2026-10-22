import type { HTMLAttributes } from 'react'
import { cx } from '@/lib/cx'

type CardProps = HTMLAttributes<HTMLDivElement> & {
  /** `lg` for hero cards (radius 32), `md` for list cards (radius 24). */
  radius?: 'lg' | 'md'
}

export function Card({ radius = 'md', className, ...props }: CardProps) {
  return (
    <div
      className={cx(
        'border border-surface-2 bg-surface text-on-surface',
        radius === 'lg' ? 'rounded-card-lg p-5' : 'rounded-card p-4',
        className,
      )}
      {...props}
    />
  )
}
