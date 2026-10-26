import { ChefHat, Plus } from 'lucide-react'
import { daysSinceCooked, isFinished, shouldCheckFreshness } from '@/domain/mealPrep'
import { cx } from '@/lib/cx'
import { focusRing, pressable } from '@/ui/styles'
import { toMealPrep, useMealPreps, type MealPrepRecord } from './api'
import { cookedAgoLabel, FRESHNESS_NOTE, remainingLabel } from './labels'

/**
 * HU-18 CA1: the active batches, above the search of Agregar. Renders nothing
 * while loading, on error or without active batches, so it never gets in the way.
 */
export function ActiveMealPreps({
  today,
  onPick,
}: {
  today: string
  onPick: (prep: MealPrepRecord) => void
}) {
  const preps = useMealPreps()
  const active = preps.data?.filter((prep) => !isFinished(toMealPrep(prep))) ?? []
  if (active.length === 0) return null

  return (
    <section aria-labelledby="active-meal-preps" className="space-y-2">
      <h2 id="active-meal-preps" className="px-1 text-sm font-bold text-ink-soft">
        Tus meal prep
      </h2>
      <ul className="space-y-2">
        {active.map((prep) => (
          <li key={prep.id}>
            <button
              type="button"
              onClick={() => onPick(prep)}
              className={cx(
                'flex w-full items-center gap-3 rounded-card border border-surface-2 bg-surface p-3 text-left text-on-surface',
                focusRing,
                pressable,
              )}
            >
              <span
                aria-hidden="true"
                className="grid size-11 shrink-0 place-items-center rounded-icon bg-surface-2 text-accent"
              >
                <ChefHat className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-extrabold [overflow-wrap:anywhere]">{prep.name}</span>
                <span className="block text-sm font-semibold text-on-surface-muted">
                  {remainingLabel(toMealPrep(prep))} ·{' '}
                  {cookedAgoLabel(daysSinceCooked(prep.cookedOn, today)).toLowerCase()}
                  {shouldCheckFreshness(prep.cookedOn, today) && `. ${FRESHNESS_NOTE}`}
                </span>
              </span>
              <Plus aria-hidden="true" className="size-6 shrink-0 text-accent" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
