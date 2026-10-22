import type { ReactNode } from 'react'
import { cx } from '@/lib/cx'

type EmptyStateProps = {
  icon: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cx('flex flex-col items-center gap-3 px-4 py-8 text-center', className)}>
      <span
        aria-hidden="true"
        className="grid size-14 place-items-center rounded-icon bg-surface text-accent"
      >
        {icon}
      </span>
      <h2 className="text-lg font-extrabold text-ink">{title}</h2>
      {description && <p className="max-w-xs font-semibold text-ink-soft">{description}</p>}
      {action && <div className="mt-2 w-full">{action}</div>}
    </div>
  )
}
