import { Check } from 'lucide-react'
import { useId, type ReactNode } from 'react'
import { cx } from '@/lib/cx'

export type OptionCard<T extends string> = {
  value: T
  title: string
  description?: string
  icon?: ReactNode
}

type OptionCardsProps<T extends string> = {
  /** Accessible name for the group (the question). */
  label: string
  options: ReadonlyArray<OptionCard<T>>
  value: T | undefined
  onChange: (value: T) => void
  error?: string
  className?: string
}

/**
 * One choice among large graphite cards (onboarding). Native radios underneath,
 * so arrow keys and screen readers work as for any radio group.
 */
export function OptionCards<T extends string>({
  label,
  options,
  value,
  onChange,
  error,
  className,
}: OptionCardsProps<T>) {
  const name = useId()
  const errorId = `${name}-error`

  return (
    <fieldset aria-describedby={error ? errorId : undefined} className={cx('space-y-3', className)}>
      <legend className="sr-only">{label}</legend>
      {options.map((option) => {
        const selected = option.value === value
        return (
          <label
            key={option.value}
            className={cx(
              'flex min-h-11 cursor-pointer items-center gap-4 rounded-card border-2 bg-surface p-4 text-on-surface transition duration-150 ease-out',
              'has-focus-visible:ring-2 has-focus-visible:ring-accent has-focus-visible:ring-offset-2 has-focus-visible:ring-offset-ink',
              selected ? 'border-accent' : 'border-surface',
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={selected}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            {option.icon && (
              <span
                aria-hidden="true"
                className={cx(
                  'grid size-12 shrink-0 place-items-center rounded-icon',
                  selected ? 'bg-accent text-on-accent' : 'bg-surface-2 text-on-surface',
                )}
              >
                {option.icon}
              </span>
            )}
            <span className="flex-1">
              <span className="block text-lg font-extrabold">{option.title}</span>
              {option.description && (
                <span className="block text-sm font-semibold text-on-surface-muted">
                  {option.description}
                </span>
              )}
            </span>
            {selected && <Check aria-hidden="true" className="size-6 shrink-0 text-accent" />}
          </label>
        )
      })}
      {error && (
        <p id={errorId} className="text-sm font-bold text-ink">
          {error}
        </p>
      )}
    </fieldset>
  )
}
