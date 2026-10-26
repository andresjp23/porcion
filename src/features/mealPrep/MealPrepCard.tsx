import { ChefHat, ChevronRight } from 'lucide-react'
import { Link } from 'react-router'
import { daysSinceCooked, shouldCheckFreshness } from '@/domain/mealPrep'
import { cx } from '@/lib/cx'
import { focusRing, pressable } from '@/ui/styles'
import { toMealPrep, type MealPrepRecord } from './api'
import { cookedAgoLabel, FRESHNESS_NOTE, remainingLabel } from './labels'

/** An active batch: what is left and how long ago it was cooked (HU-18 CA1, R-15). */
export function MealPrepCard({
  prep,
  today,
  to,
}: {
  prep: MealPrepRecord
  today: string
  to: string
}) {
  const days = daysSinceCooked(prep.cookedOn, today)
  return (
    <Link
      to={to}
      className={cx(
        'flex items-center gap-4 rounded-card border border-surface-2 bg-surface p-4 text-on-surface',
        focusRing,
        pressable,
      )}
    >
      <span
        aria-hidden="true"
        className="grid size-12 shrink-0 place-items-center rounded-icon bg-surface-2 text-accent"
      >
        <ChefHat />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-lg font-extrabold [overflow-wrap:anywhere]">{prep.name}</span>
        <span className="block font-bold">{remainingLabel(toMealPrep(prep))}</span>
        <span className="block text-sm font-semibold text-on-surface-muted">
          {cookedAgoLabel(days)}
          {shouldCheckFreshness(prep.cookedOn, today) && ` · ${FRESHNESS_NOTE}`}
        </span>
      </span>
      <ChevronRight aria-hidden="true" className="size-6 shrink-0 text-accent" />
    </Link>
  )
}
