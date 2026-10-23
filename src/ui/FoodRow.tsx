import { Plus } from 'lucide-react'
import { cx } from '@/lib/cx'
import { formatKcal } from '@/lib/format'
import { IconButton } from './IconButton'
import { focusRing } from './styles'

type FoodRowProps = {
  name: string
  /** Portion description, e.g. "1 unidad · 50 g". */
  portion: string
  kcal: number
  onSelect: () => void
  /** The 2-tap add (HU-04 CA4). Without it the row has no "+" button. */
  onAdd?: () => void
  className?: string
}

export function FoodRow({ name, portion, kcal, onSelect, onAdd, className }: FoodRowProps) {
  return (
    <div
      className={cx(
        'flex items-center gap-3 rounded-card border border-surface-2 bg-surface p-3 text-on-surface',
        className,
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        className={cx('flex min-w-0 flex-1 items-center gap-3 rounded-icon text-left', focusRing)}
      >
        <span
          aria-hidden="true"
          className="grid size-11 shrink-0 place-items-center rounded-icon bg-surface-2 text-lg font-extrabold text-on-surface-muted"
        >
          {name.charAt(0).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-base font-extrabold">{name}</span>
          <span className="block truncate text-sm font-semibold text-on-surface-muted">
            {portion}
          </span>
        </span>
        <span className="shrink-0 text-on-surface-muted">
          <span className="text-base font-extrabold text-on-surface">{formatKcal(kcal)}</span> kcal
        </span>
      </button>
      {onAdd && (
        <IconButton
          label={`Agregar ${name}`}
          icon={<Plus aria-hidden="true" />}
          variant="subtle"
          onClick={onAdd}
        />
      )}
    </div>
  )
}
