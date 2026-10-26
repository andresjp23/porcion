// R-14 and R-15: a meal prep is a batch cooked at home. Its ingredients are
// weighed raw and the batch is weighed cooked, so the water lost (chicken) or
// absorbed (rice) changes the weight but not the energy. Nothing here rounds.

import {
  nutrientsForGrams,
  nutrientsPer100ForRecipe,
  sumNutrients,
  type Nutrients,
  type RecipeIngredient,
} from './nutrition'

/** R-14 ranges. */
export const MAX_MEAL_PREP_INGREDIENTS = 30
export const MAX_INGREDIENT_GRAMS = 10000
export const MAX_COOKED_GRAMS = 20000
export const MAX_SERVINGS = 50
/** A cooked weight over 3× the raw one was probably weighed without tare. Rice can reach ~3×. */
export const SUSPICIOUS_COOKED_RATIO = 3
/** R-15: USDA keeps cooked food 3 to 4 days in the fridge. */
export const CHECK_AFTER_DAYS = 4

export type MealPrep = {
  /** Raw ingredients, with the per-100 g snapshot taken when they were added. */
  ingredients: RecipeIngredient[]
  /** Net cooked weight; null falls back to the raw weight (HU-17 CA3). */
  cookedGrams: number | null
  /** Equal servings the batch was split into, if any (HU-17 CA4). */
  servings: number | null
  /** "Se terminó" was tapped (HU-19 CA1). */
  finishedByHand: boolean
  /** Grams already logged from this batch. */
  loggedGrams: number
}

/** Sum of the raw ingredients' grams. */
export function rawGrams(ingredients: RecipeIngredient[]) {
  return ingredients.reduce((total, { grams }) => total + grams, 0)
}

/** Energy and macros of the whole batch: cooking does not change them. */
export function totalNutrients(ingredients: RecipeIngredient[]): Nutrients {
  return sumNutrients(ingredients.map(({ per100, grams }) => nutrientsForGrams(per100, grams)))
}

/** The weight the batch is divided by: the cooked one, or the raw sum without it. */
export function batchGrams({
  ingredients,
  cookedGrams,
}: Pick<MealPrep, 'ingredients' | 'cookedGrams'>) {
  return cookedGrams ?? rawGrams(ingredients)
}

/** Nutrients per 100 g of the batch as it is served (cooked). */
export function per100Cooked(prep: Pick<MealPrep, 'ingredients' | 'cookedGrams'>): Nutrients {
  return nutrientsPer100ForRecipe(prep.ingredients, batchGrams(prep))
}

/** Grams of one serving, or null when the batch was not split. */
export function servingGrams(prep: Pick<MealPrep, 'ingredients' | 'cookedGrams' | 'servings'>) {
  return prep.servings ? batchGrams(prep) / prep.servings : null
}

/** What is left in the fridge. Logging more than that is allowed (HU-18 CA4), so it stops at 0. */
export function remainingGrams(
  prep: Pick<MealPrep, 'ingredients' | 'cookedGrams' | 'loggedGrams'>,
) {
  return Math.max(0, batchGrams(prep) - prep.loggedGrams)
}

/** Servings that the remaining grams still give, or null when the batch was not split. */
export function servingsLeft(prep: MealPrep) {
  const grams = servingGrams(prep)
  return grams === null ? null : remainingGrams(prep) / grams
}

/**
 * Finished by hand, or because nothing is left. It is derived, not stored, so
 * deleting a log brings an emptied batch back (R-14).
 */
export function isFinished(prep: MealPrep) {
  return prep.finishedByHand || remainingGrams(prep) === 0
}

/** Warns, without blocking, when the cooked weight looks like it includes the container (R-14). */
export function cookedWeightLooksOff(ingredients: RecipeIngredient[], cookedGrams: number) {
  return cookedGrams > rawGrams(ingredients) * SUSPICIOUS_COOKED_RATIO
}

/** Whole days between the cooking day and today, both local ISO dates (R-15). */
export function daysSinceCooked(cookedOn: string, today: string) {
  // Both dates read as UTC midnights, so no daylight saving shift gets in between.
  const days = (Date.parse(today) - Date.parse(cookedOn)) / 86_400_000
  return Math.max(0, Math.round(days))
}

/** R-15: from day 4 the card adds a neutral "check it is still good" note. */
export function shouldCheckFreshness(cookedOn: string, today: string) {
  return daysSinceCooked(cookedOn, today) >= CHECK_AFTER_DAYS
}
