// What the meal prep cards and page say about a batch (R-15, HU-18 CA1).
import { remainingGrams, servingsLeft, type MealPrep } from '@/domain/mealPrep'
import { formatGrams } from '@/lib/format'

/** "Cocinado hoy", "Cocinado ayer" or "Cocinado hace 3 días". */
export function cookedAgoLabel(days: number) {
  if (days === 0) return 'Cocinado hoy'
  if (days === 1) return 'Cocinado ayer'
  return `Cocinado hace ${days} días`
}

/** R-15, from day 4. Neutral on purpose (R-08). */
export const FRESHNESS_NOTE = 'Revisa que siga bien antes de comerlo'

/** "Quedan 945 g · 3 porciones": whole servings only, since a fraction reads oddly here. */
export function remainingLabel(prep: MealPrep) {
  const grams = `Quedan ${formatGrams(remainingGrams(prep))} g`
  const servings = servingsLeft(prep)
  if (servings === null) return grams
  const whole = Math.floor(servings)
  return `${grams} · ${whole === 1 ? '1 porción' : `${whole} porciones`}`
}
