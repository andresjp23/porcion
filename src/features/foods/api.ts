import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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

export type FoodPortion = { id: string; name: string; grams: number; isDefault: boolean }

/** A food with all its portions, for the Detail (HU-05). */
export type FoodDetail = Omit<FoodListItem, 'defaultPortion'> & { portions: FoodPortion[] }

const foodDetailSchema = z
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
    food_portions: z.array(
      z.object({ id: z.string(), name: z.string(), grams: z.number(), is_default: z.boolean() }),
    ),
  })
  .transform((row): FoodDetail => ({
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
    // Default first, then from the smallest portion up.
    portions: row.food_portions
      .map((p) => ({ id: p.id, name: p.name, grams: p.grams, isDefault: p.is_default }))
      .sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || a.grams - b.grams),
  }))

// Explicit columns: created_by is not readable by other users (R-11, B-7).
const FOOD_DETAIL_COLUMNS =
  'id, name, brand, basis, kcal_100, protein_100, carbs_100, fat_100, source, verified, open_reports, food_portions (id, name, grams, is_default)'

export const foodDetailKeys = {
  detail: (id: string) => ['foods', 'detail', id] as const,
  favorite: (id: string) => ['foods', 'favorite', id] as const,
}

/** The food, or null when it does not exist (or the id is not a UUID). */
export function useFoodDetail(id: string) {
  return useQuery({
    queryKey: foodDetailKeys.detail(id),
    queryFn: async ({ signal }) => {
      if (!z.uuid().safeParse(id).success) return null
      const { data, error } = await supabase
        .from('foods')
        .select(FOOD_DETAIL_COLUMNS)
        .eq('id', id)
        .abortSignal(signal)
        .maybeSingle()
      if (error) throw error
      return data === null ? null : foodDetailSchema.parse(data)
    },
  })
}

/** HU-05 CA5: whether the signed-in user marked this food as a favorite. */
export function useIsFavorite(foodId: string) {
  return useQuery({
    queryKey: foodDetailKeys.favorite(foodId),
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase
        .from('favorites')
        .select('food_id')
        .eq('food_id', foodId)
        .abortSignal(signal)
        .maybeSingle()
      if (error) throw error
      return data !== null
    },
  })
}

/** Marks or unmarks a favorite, showing the change before the server confirms it. */
export function useToggleFavorite(foodId: string) {
  const queryClient = useQueryClient()
  const key = foodDetailKeys.favorite(foodId)
  return useMutation({
    mutationFn: async (favorite: boolean) => {
      const { error } = favorite
        ? await supabase.from('favorites').insert({ food_id: foodId })
        : await supabase.from('favorites').delete().eq('food_id', foodId)
      if (error) throw error
    },
    onMutate: async (favorite) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<boolean>(key)
      queryClient.setQueryData(key, favorite)
      return { previous }
    },
    onError: (_error, _favorite, context) => {
      queryClient.setQueryData(key, context?.previous)
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: key })
      void queryClient.invalidateQueries({ queryKey: foodKeys.favorites })
    },
  })
}

export type NewFood = {
  name: string
  brand: string
  basis: 'g' | 'ml'
  per100: Nutrients
  /** Canonical barcode (src/domain/barcode.ts), when it comes from the scanner. */
  barcode: string | null
  /** The first one is the default portion. */
  portions: { name: string; grams: number }[]
}

/** HU-09 CA5: the barcode is already taken by this food. */
export class BarcodeTakenError extends Error {
  readonly foodId: string | null

  constructor(foodId: string | null) {
    super('barcode taken')
    this.foodId = foodId
  }
}

const UNIQUE_VIOLATION = '23505'

/** HU-09: creates a community food with its portions and returns its id. */
export function useCreateFood() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (food: NewFood) => {
      const { data, error } = await supabase.rpc('create_food', {
        name: food.name,
        brand: food.brand,
        basis: food.basis,
        kcal_100: food.per100.kcal,
        protein_100: food.per100.protein,
        carbs_100: food.per100.carbs,
        fat_100: food.per100.fat,
        barcode: food.barcode ?? undefined,
        portions: food.portions,
      })
      if (error?.code === UNIQUE_VIOLATION && food.barcode) {
        const existing = await supabase
          .from('foods')
          .select('id')
          .eq('barcode', food.barcode)
          .maybeSingle()
        throw new BarcodeTakenError(existing.data?.id ?? null)
      }
      if (error) throw error
      return z.string().parse(data)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: foodKeys.mine })
    },
  })
}

const reportKey = (foodId: string) => ['foods', 'report', foodId] as const

/** Whether the user already has an open report on this food (one per user, HU-10). */
export function useHasOpenReport(foodId: string, enabled: boolean) {
  return useQuery({
    queryKey: reportKey(foodId),
    enabled,
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase
        .from('food_reports')
        .select('id')
        .eq('food_id', foodId)
        .eq('status', 'open')
        .abortSignal(signal)
        .maybeSingle()
      if (error) throw error
      return data !== null
    },
  })
}

/** HU-10 CA1: reports wrong data in a community food. */
export function useReportFood(foodId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (reason: string) => {
      const { error } = await supabase.from('food_reports').insert({ food_id: foodId, reason })
      // Already reported, maybe from another tab: the outcome is the same.
      if (error && error.code !== UNIQUE_VIOLATION) throw error
    },
    onSuccess: () => {
      queryClient.setQueryData(reportKey(foodId), true)
      // open_reports changed, and with it maybe "Datos en revisión".
      void queryClient.invalidateQueries({ queryKey: foodDetailKeys.detail(foodId) })
    },
  })
}
