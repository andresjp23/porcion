// R-01 and R-02: nutrients are stored per 100 g (or 100 ml, assumed 1 ml = 1 g)
// and scaled by grams. Nothing here rounds; rounding happens only on display.

/** Energy and macros: kcal, and grams of protein, carbs and fat. */
export type Nutrients = {
  kcal: number
  protein: number
  carbs: number
  fat: number
}

/** A named serving with its weight in grams, e.g. "1 unidad" = 120 g. */
export type Portion = {
  grams: number
}

function assertNonNegative(value: number, name: string) {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} must be a finite number ≥ 0, got ${value}`)
  }
}

/** Grams eaten for a number of portions: 1.5 × "1 taza" (200 g) → 300 g. */
export function gramsForPortion(portion: Portion, quantity: number) {
  assertNonNegative(portion.grams, 'portion.grams')
  assertNonNegative(quantity, 'quantity')
  return portion.grams * quantity
}

/** R-02: `value = value_100 × grams / 100`, for kcal and each macro. */
export function nutrientsForGrams(per100: Nutrients, grams: number): Nutrients {
  assertNonNegative(grams, 'grams')
  const factor = grams / 100
  return {
    kcal: per100.kcal * factor,
    protein: per100.protein * factor,
    carbs: per100.carbs * factor,
    fat: per100.fat * factor,
  }
}

/** Nutrients for a number of portions of a food. */
export function nutrientsForPortion(per100: Nutrients, portion: Portion, quantity: number) {
  return nutrientsForGrams(per100, gramsForPortion(portion, quantity))
}

/** An ingredient of a recipe: its nutrients per 100 g and the grams used. */
export type RecipeIngredient = {
  per100: Nutrients
  grams: number
}

/**
 * Nutrients per 100 g of a cooked recipe: the sum of its ingredients divided
 * by the weight after cooking, so water lost in the oven concentrates them.
 */
export function nutrientsPer100ForRecipe(
  ingredients: RecipeIngredient[],
  cookedGrams: number,
): Nutrients {
  if (!Number.isFinite(cookedGrams) || cookedGrams <= 0) {
    throw new RangeError(`cookedGrams must be a finite number > 0, got ${cookedGrams}`)
  }
  const total: Nutrients = { kcal: 0, protein: 0, carbs: 0, fat: 0 }
  for (const { per100, grams } of ingredients) {
    const n = nutrientsForGrams(per100, grams)
    total.kcal += n.kcal
    total.protein += n.protein
    total.carbs += n.carbs
    total.fat += n.fat
  }
  const factor = 100 / cookedGrams
  return {
    kcal: total.kcal * factor,
    protein: total.protein * factor,
    carbs: total.carbs * factor,
    fat: total.fat * factor,
  }
}
