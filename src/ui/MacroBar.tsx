import { cx } from '@/lib/cx'
import { formatGrams } from '@/lib/format'

export type Macro = 'protein' | 'carbs' | 'fat'

const macroLabels: Record<Macro, string> = {
  protein: 'Proteína',
  carbs: 'Carbos',
  fat: 'Grasas',
}

const fillClasses: Record<Macro, string> = {
  protein: 'bg-protein',
  carbs: 'bg-carbs',
  fat: 'bg-fat',
}

type MacroBarProps = {
  macro: Macro
  /** Grams consumed. */
  value: number
  /** Target in grams. */
  target: number
  className?: string
}

export function MacroBar({ macro, value, target, className }: MacroBarProps) {
  const label = macroLabels[macro]
  const ratio = target > 0 ? Math.min(value / target, 1) : 0

  return (
    // Flex column with the bar pushed down: when a narrow column wraps its
    // numbers, the three bars of the row still line up.
    <div className={cx('flex flex-col gap-2', className)}>
      <p className="text-sm font-bold text-on-surface-muted">{label}</p>
      <p className="text-on-surface-muted">
        <span className="text-lg font-extrabold text-on-surface">{formatGrams(value)}</span>{' '}
        {/* Wraps as a whole ("/ 111 g"), never leaving the unit alone on a line. */}
        <span className="whitespace-nowrap">/ {formatGrams(target)} g</span>
      </p>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={target}
        aria-valuenow={Math.min(value, target)}
        aria-valuetext={`${formatGrams(value)} de ${formatGrams(target)} g`}
        className="mt-auto h-2 overflow-hidden rounded-full bg-surface-2"
      >
        <div
          className={cx(
            'h-full rounded-full transition-[width] duration-200 ease-out',
            fillClasses[macro],
          )}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
    </div>
  )
}
