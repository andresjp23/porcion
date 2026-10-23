import { useEffect, type ReactNode } from 'react'
import { cx } from '@/lib/cx'

type ToastProps = {
  /** Changing the message restarts the timer. */
  message: string
  onDismiss: () => void
  /** E.g. "Deshacer" (HU-06 CA2). */
  action?: ReactNode
  durationMs?: number
  className?: string
}

/** A short notice above the bottom of the screen, read out by screen readers. */
export function Toast({ message, onDismiss, action, durationMs = 4000, className }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, durationMs)
    return () => clearTimeout(timer)
  }, [message, durationMs, onDismiss])

  return (
    <div
      role="status"
      className={cx(
        'fixed inset-x-0 bottom-24 z-20 mx-auto flex w-[calc(100%-2rem)] max-w-md items-center justify-between gap-3 rounded-card bg-ink px-4 py-3 text-on-surface shadow-xl shadow-ink/20',
        className,
      )}
    >
      <p className="font-bold">{message}</p>
      {action}
    </div>
  )
}
