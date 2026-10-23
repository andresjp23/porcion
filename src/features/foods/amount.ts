// What the Detail is about to log: a number of portions, or plain grams (HU-05 CA2).
import { gramsForPortion } from '@/domain/nutrition'
import { formatGrams } from '@/lib/format'
import type { FoodDetail } from './api'

export type Amount =
  { kind: 'portion'; portionId: string; quantity: number } | { kind: 'grams'; grams: number }

type Food = Pick<FoodDetail, 'basis' | 'portions'>

/** Steps of the −/+ buttons: half a portion, or 10 g. */
export const PORTION_STEP = 0.5
export const GRAMS_STEP = 10

// A portion name that already states its weight, e.g. "1 vaso (200 ml)".
const STATES_AMOUNT = /\(\s*[\d.,]+\s*(g|ml)\s*\)/

export function statesAmount(portionName: string) {
  return STATES_AMOUNT.test(portionName)
}

/** Chip label for a portion: "1 marraqueta (100 g)", or the name if it already says it. */
export function portionLabel(portion: { name: string; grams: number }, basis: Food['basis']) {
  return statesAmount(portion.name)
    ? portion.name
    : `${portion.name} (${formatGrams(portion.grams)} ${basis})`
}

/** One default portion, else the first one, else 100 g. */
export function initialAmount(food: Food): Amount {
  const portion = food.portions.find((p) => p.isDefault) ?? food.portions[0]
  return portion
    ? { kind: 'portion', portionId: portion.id, quantity: 1 }
    : { kind: 'grams', grams: 100 }
}

function findPortion(food: Food, amount: Amount) {
  return amount.kind === 'portion'
    ? food.portions.find((p) => p.id === amount.portionId)
    : undefined
}

export function amountGrams(food: Food, amount: Amount) {
  if (amount.kind === 'grams') return amount.grams
  const portion = findPortion(food, amount)
  return portion ? gramsForPortion(portion, amount.quantity) : 0
}

/** Switching to grams keeps the weight; choosing a portion starts at 1. */
export function switchAmount(food: Food, amount: Amount, target: string | 'grams'): Amount {
  if (target === 'grams') return { kind: 'grams', grams: amountGrams(food, amount) }
  return { kind: 'portion', portionId: target, quantity: 1 }
}

/** Hero card caption: "1 marraqueta · 100 g", "1,5 × 1 marraqueta · 150 g" or "150 g". */
export function amountLabel(food: Food, amount: Amount) {
  const weight = `${formatGrams(amountGrams(food, amount))} ${food.basis}`
  const portion = findPortion(food, amount)
  if (amount.kind === 'grams' || !portion) return weight
  const name =
    amount.quantity === 1 ? portion.name : `${formatGrams(amount.quantity)} × ${portion.name}`
  return `${name} · ${weight}`
}
