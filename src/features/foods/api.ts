import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import type { Nutrients } from '@/domain/nutrition'
import { supabase } from '@/lib/supabase'

/**
 * A food as the lists of Agregar alimento show it. The generated types of
 * these RPCs disagree on nullability, so rows are parsed here instead.
 */
export type FoodListItem = {
  id: string
  name: string
  brand: string | null
  basis: 'g' | 'ml'
  per100: Nutrients
  source: 'seed' | 'off' | 'user'
  verified: boolean
  openReports: number
  defaultPortion: { id: string; name: string; grams: number } | null
}

const foodListItemSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    brand: z.string().nullable(),
    basis: z.enum(['g', 'ml']),
    kcal_100: z.number(),
    protein_100: z.number(),
    carbs_100: z.number(),
    fat_100: z.number(),
    source: z.enum(['seed', 'off', 'user']),
    verified: z.boolean(),
    open_reports: z.number(),
    default_portion_id: z.string().nullable(),
    default_portion_name: z.string().nullable(),
    default_portion_grams: z.number().nullable(),
  })
  .transform((row): FoodListItem => ({
    id: row.id,
    name: row.name,
    brand: row.brand,
    basis: row.basis,
    per100: {
      kcal: row.kcal_100,
      protein: row.protein_100,
      carbs: row.carbs_100,
      fat: row.fat_100,
    },
    source: row.source,
    verified: row.verified,
    openReports: row.open_reports,
    defaultPortion:
      row.default_portion_id && row.default_portion_name && row.default_portion_grams !== null
        ? {
            id: row.default_portion_id,
            name: row.default_portion_name,
            grams: row.default_portion_grams,
          }
        : null,
  }))

const foodListSchema = z.array(foodListItemSchema)

export const foodKeys = {
  search: (q: string) => ['foods', 'search', q] as const,
  favorites: ['foods', 'favorites'] as const,
  mine: ['foods', 'mine'] as const,
}

/** Most results the search shows at once. */
export const SEARCH_LIMIT = 20

/** HU-04 CA3: matching foods for an already debounced and trimmed query. */
export function useFoodSearch(q: string) {
  return useQuery({
    queryKey: foodKeys.search(q),
    enabled: q !== '',
    // Keep the last results on screen while the next query loads.
    placeholderData: keepPreviousData,
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase
        .rpc('search_foods', { q, lim: SEARCH_LIMIT })
        .abortSignal(signal)
      if (error) throw error
      return foodListSchema.parse(data)
    },
  })
}

export function useFavoriteFoods(enabled: boolean) {
  return useQuery({
    queryKey: foodKeys.favorites,
    enabled,
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase.rpc('favorite_foods').abortSignal(signal)
      if (error) throw error
      return foodListSchema.parse(data)
    },
  })
}

export function useMyFoods(enabled: boolean) {
  return useQuery({
    queryKey: foodKeys.mine,
    enabled,
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase.rpc('my_foods').abortSignal(signal)
      if (error) throw error
      return foodListSchema.parse(data)
    },
  })
}
