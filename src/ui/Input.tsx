import { CircleAlert } from 'lucide-react'
import { useId, type InputHTMLAttributes } from 'react'
import { cx } from '@/lib/cx'
import { focusRing } from './styles'

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> & {
  label: string
  hint?: string
  /** Shown with an icon and a 2px border. Never red (docs/ui.md). */
  error?: string
}

/** Labelled text field, meant to sit inside a graphite Card. */
export function Input({ label, hint, error, className, ...props }: InputProps) {
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className={cx('space-y-2', className)}>
      <label htmlFor={id} className="block text-sm font-bold text-on-surface-muted">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cx(
          'h-12 w-full rounded-field bg-surface-2 px-4 text-base font-bold text-on-surface placeholder:text-on-surface-muted',
          error ? 'border-2 border-on-surface' : 'border-2 border-transparent',
          focusRing,
        )}
        {...props}
      />
      {hint && !error && (
        <p id={hintId} className="text-sm font-semibold text-on-surface-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="flex items-center gap-2 text-sm font-bold text-on-surface">
          <CircleAlert aria-hidden="true" className="size-4 shrink-0 text-accent" />
          {error}
        </p>
      )}
    </div>
  )
}
