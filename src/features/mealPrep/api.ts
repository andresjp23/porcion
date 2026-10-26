import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import type { Nutrients } from '@/domain/nutrition'
import { supabase } from '@/lib/supabase'

export type MealPrepIngredient = {
  foodId: string | null
  foodName: string
  grams: number
  /** Snapshot taken when it was added (R-14). */
  per100: Nutrients
}

/** A batch as my_meal_preps returns it. What is left is derived in src/domain/mealPrep.ts. */
export type MealPrepRecord = {
  id: string
  name: string
  cookedOn: string
  cookedGrams: number | null
  servings: number | null
  finishedAt: string | null
  createdAt: string
  ingredients: MealPrepIngredient[]
  loggedGrams: number
}

const ingredientSchema = z
  .object({
    food_id: z.string().nullable(),
    food_name: z.string(),
    grams: z.number(),
    kcal_100: z.number(),
    protein_100: z.number(),
    carbs_100: z.number(),
    fat_100: z.number(),
  })
  .transform((row): MealPrepIngredient => ({
    foodId: row.food_id,
    foodName: row.food_name,
    grams: row.grams,
    per100: {
      kcal: row.kcal_100,
      protein: row.protein_100,
      carbs: row.carbs_100,
      fat: row.fat_100,
    },
  }))

const mealPrepSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    cooked_on: z.string(),
    cooked_grams: z.number().nullable(),
    servings: z.number().nullable(),
    finished_at: z.string().nullable(),
    created_at: z.string(),
    ingredients: z.array(ingredientSchema),
    logged_grams: z.number(),
  })
  .transform((row): MealPrepRecord => ({
    id: row.id,
    name: row.name,
    cookedOn: row.cooked_on,
    cookedGrams: row.cooked_grams,
    servings: row.servings,
    finishedAt: row.finished_at,
    createdAt: row.created_at,
    ingredients: row.ingredients,
    loggedGrams: row.logged_grams,
  }))

export const mealPrepKeys = {
  all: ['meal-preps'] as const,
}

/** The user's batches, newest first (HU-18 CA1, HU-19). */
export function useMealPreps() {
  return useQuery({
    queryKey: mealPrepKeys.all,
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase.rpc('my_meal_preps').abortSignal(signal)
      if (error) throw error
      return z.array(mealPrepSchema).parse(data)
    },
  })
}

/** One batch, read from the list: there are few, and the list is usually cached. */
export function useMealPrep(id: string | undefined) {
  const preps = useMealPreps()
  return { ...preps, data: id ? preps.data?.find((prep) => prep.id === id) : undefined }
}

export type MealPrepDraft = {
  name: string
  cookedOn: string
  cookedGrams: number | null
  servings: number | null
  ingredients: MealPrepIngredient[]
}

/** HU-17: creates a batch (no id) or replaces one, ingredients included. Returns its id. */
export function useSaveMealPrep(id?: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (draft: MealPrepDraft) => {
      const { data, error } = await supabase.rpc('save_meal_prep', {
        // The generated types mark every argument as required and non-null,
        // but the RPC takes null for a new batch and for the optional fields.
        prep_id: (id ?? null) as string,
        name: draft.name,
        cooked_on: draft.cookedOn,
        cooked_grams: draft.cookedGrams as number,
        servings: draft.servings as number,
        ingredients: draft.ingredients.map((ingredient) => ({
          food_id: ingredient.foodId,
          food_name: ingredient.foodName,
          grams: ingredient.grams,
          kcal_100: ingredient.per100.kcal,
          protein_100: ingredient.per100.protein,
          carbs_100: ingredient.per100.carbs,
          fat_100: ingredient.per100.fat,
        })),
      })
      if (error) throw error
      return z.string().parse(data)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: mealPrepKeys.all }),
  })
}
