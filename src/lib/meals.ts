import type { Meal } from '@/domain/meal'

/** Meals in the order of the day, with their interface labels. */
export const MEALS: ReadonlyArray<{ value: Meal; label: string }> = [
  { value: 'breakfast', label: 'Desayuno' },
  { value: 'lunch', label: 'Almuerzo' },
  { value: 'snack', label: 'Colación' },
  { value: 'dinner', label: 'Cena' },
]

/** A meal from a URL parameter, or null if it is missing or unknown. */
export function parseMeal(value: string | null): Meal | null {
  return MEALS.find((meal) => meal.value === value)?.value ?? null
}
