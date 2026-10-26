import { CircleAlert } from 'lucide-react'
import { useId, type InputHTMLAttributes, type ReactNode } from 'react'
import { cx } from '@/lib/cx'
import { focusRing } from './styles'

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'type'> & {
  label: ReactNode
  /** Shown with an icon, like Input. Never red (docs/ui.md). */
  error?: string
}

/** Native checkbox with its label as a 44 px tall touch target; for graphite Cards. */
export function Checkbox({ label, error, className, ...props }: CheckboxProps) {
  const id = useId()
  const errorId = `${id}-error`

  return (
    <div className={cx('space-y-1', className)}>
      {/* The whole row is the label, so the 44 px touch target includes the box. */}
      <label htmlFor={id} className="flex min-h-11 cursor-pointer items-start gap-3 py-2.5">
        <input
          id={id}
          type="checkbox"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cx('mt-0.5 size-6 shrink-0 rounded accent-accent', focusRing)}
          {...props}
        />
        <span className="text-base font-semibold text-on-surface">{label}</span>
      </label>
      {error && (
        <p id={errorId} className="flex items-center gap-2 text-sm font-bold text-on-surface">
          <CircleAlert aria-hidden="true" className="size-4 shrink-0 text-accent" />
          {error}
        </p>
      )}
    </div>
  )
}
