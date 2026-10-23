import { nutrientsForGrams } from '@/domain/nutrition'
import { formatGrams } from '@/lib/format'
import { statesAmount } from './amount'
import type { FoodListItem } from './api'

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
    : statesAmount(portion.name)
      ? portion.name
      : `${portion.name} · ${amount}`
  return { label, grams, kcal: nutrientsForGrams(food.per100, grams).kcal }
}

/** How lists and logs name a food: "Galletas · Costa", or just the name. */
export function foodDisplayName(food: Pick<FoodListItem, 'name' | 'brand'>) {
  return food.brand ? `${food.name} · ${food.brand}` : food.name
}
