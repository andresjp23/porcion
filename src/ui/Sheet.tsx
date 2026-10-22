import { useEffect, useId, useRef, type ReactNode } from 'react'
import { cx } from '@/lib/cx'

type SheetProps = {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  className?: string
}

/**
 * Bottom sheet built on the native <dialog>: it traps focus, closes on Escape
 * and restores focus to the trigger without extra code.
 */
export function Sheet({ open, onClose, title, children, className }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    // Backdrop click is a mouse shortcut; keyboard users close with Escape (native).
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={() => {
        // Skip when the parent closed it: it already knows.
        if (open) onClose()
      }}
      onClick={(event) => {
        // A click on the dialog element itself is a click on the backdrop.
        if (event.target === event.currentTarget) onClose()
      }}
      className={cx(
        'fixed inset-x-0 top-auto bottom-0 m-0 w-full max-w-none bg-transparent p-0 text-ink',
        'backdrop:bg-ink/50',
        'translate-y-0 transition-transform duration-250 ease-out starting:open:translate-y-full',
      )}
    >
      <div
        className={cx(
          'mx-auto max-w-md rounded-t-card-lg bg-bg px-4 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))]',
          className,
        )}
      >
        <div aria-hidden="true" className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-line" />
        <h2 id={titleId} className="mb-4 text-lg font-extrabold">
          {title}
        </h2>
        {children}
      </div>
    </dialog>
  )
}
