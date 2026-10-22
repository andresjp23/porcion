import { cx } from '@/lib/cx'
import { focusRing } from './styles'

export type SegmentedOption<T extends string> = { value: T; label: string }

type SegmentedProps<T extends string> = {
  /** Accessible name for the group. */
  label: string
  options: ReadonlyArray<SegmentedOption<T>>
  value: T
  onChange: (value: T) => void
  /** `solid`: active segment is yellow. `subtle`: active segment is raised with yellow text (tabs). */
  tone?: 'solid' | 'subtle'
  className?: string
}

export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  tone = 'solid',
  className,
}: SegmentedProps<T>) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cx('flex rounded-pill border border-surface-2 bg-surface p-1', className)}
    >
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={cx(
              'h-11 flex-1 rounded-pill px-3 text-base font-extrabold transition duration-150 ease-out',
              selected && tone === 'solid' && 'bg-accent text-on-accent',
              selected && tone === 'subtle' && 'bg-surface-2 text-accent',
              !selected && 'text-on-surface-muted',
              focusRing,
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
