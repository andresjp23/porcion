import { z } from 'zod'
import {
  MAX_COOKED_GRAMS,
  MAX_INGREDIENT_GRAMS,
  MAX_MEAL_PREP_INGREDIENTS,
  MAX_SERVINGS,
} from '@/domain/mealPrep'
import { decimalText } from '@/features/foods/createFoodSchema'

/** An optional number field: empty is null, anything else must parse. */
const optionalDecimal = z
  .string()
  .trim()
  .transform((value) => (value === '' ? null : decimalText.parse(value)))

const nutrients = z.object({
  kcal: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fat: z.number(),
})

/** HU-17 form, with the R-14 ranges. */
export const mealPrepSchema = z.object({
  name: z.string().trim().min(1, 'Escribe el nombre').max(120, 'Usa hasta 120 caracteres'),
  ingredients: z
    .array(
      z.object({
        foodId: z.string().nullable(),
        foodName: z.string(),
        /** Snapshot taken when the ingredient was picked (R-14). */
        per100: nutrients,
        grams: decimalText.pipe(
          z
            .number('Escribe los gramos')
            .min(1, 'Escribe los gramos')
            .max(MAX_INGREDIENT_GRAMS, 'Revisa los gramos'),
        ),
      }),
    )
    .min(1, 'Agrega al menos un ingrediente')
    .max(MAX_MEAL_PREP_INGREDIENTS, `Usa hasta ${MAX_MEAL_PREP_INGREDIENTS} ingredientes`),
  cookedGrams: optionalDecimal.pipe(
    z
      .number('Escribe el peso en gramos')
      .min(1, 'Revisa el peso')
      .max(MAX_COOKED_GRAMS, 'Revisa el peso')
      .nullable(),
  ),
  servings: optionalDecimal.pipe(
    z
      .number('Escribe un número entero')
      .int('Escribe un número entero')
      .min(1, `Usa de 1 a ${MAX_SERVINGS}`)
      .max(MAX_SERVINGS, `Usa de 1 a ${MAX_SERVINGS}`)
      .nullable(),
  ),
})

export type MealPrepInput = z.input<typeof mealPrepSchema>
export type MealPrepValues = z.output<typeof mealPrepSchema>
