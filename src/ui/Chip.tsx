import type { ButtonHTMLAttributes } from 'react'
import { cx } from '@/lib/cx'
import { focusRing, pressable } from './styles'

type ChipProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-pressed'> & {
  selected: boolean
}

export function Chip({ selected, className, type = 'button', ...props }: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={cx(
        'inline-flex h-11 shrink-0 items-center justify-center rounded-chip px-4 text-base font-extrabold',
        selected ? 'bg-accent text-on-accent' : 'bg-surface text-on-surface',
        focusRing,
        pressable,
        className,
      )}
      {...props}
    />
  )
}
