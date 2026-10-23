import { nutrientsForGrams } from '@/domain/nutrition'
import { formatGrams } from '@/lib/format'
import type { FoodListItem } from './api'

// A portion name that already states its weight, e.g. "1 vaso (200 ml)".
const STATES_AMOUNT = /\(\s*[\d.,]+\s*(g|ml)\s*\)/

/**
 * What a list row shows for a food: its default portion ("1 huevo · 50,3 g"),
 * or 100 g / 100 ml when it has none, with the kcal of that amount.
 */
export function defaultServing(food: Pick<FoodListItem, 'basis' | 'per100' | 'defaultPortion'>) {
  const portion = food.defaultPortion
  const grams = portion?.grams ?? 100
  const amount = `${formatGrams(grams)} ${food.basis}`
  const label = !portion
    ? amount
    : STATES_AMOUNT.test(portion.name)
      ? portion.name
      : `${portion.name} · ${amount}`
  return { label, grams, kcal: nutrientsForGrams(food.per100, grams).kcal }
}
