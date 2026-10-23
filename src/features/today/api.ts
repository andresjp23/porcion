import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import type { Meal } from '@/domain/meal'
import type { Nutrients } from '@/domain/nutrition'
import { foodKeys } from '@/features/foods/api'
import { supabase } from '@/lib/supabase'

/** One logged food, with the snapshot of its nutrients (R-02). */
export type LogEntry = {
  id: string
  foodId: string | null
  meal: Meal
  portionId: string | null
  quantity: number
  grams: number
  foodName: string
  nutrients: Nutrients
  createdAt: string
}

const logEntrySchema = z
  .object({
    id: z.string(),
    food_id: z.string().nullable(),
    meal: z.enum(['breakfast', 'lunch', 'snack', 'dinner']),
    portion_id: z.string().nullable(),
    quantity: z.number(),
    grams: z.number(),
    food_name: z.string(),
    kcal: z.number(),
    protein: z.number(),
    carbs: z.number(),
    fat: z.number(),
    created_at: z.string(),
  })
  .transform((row): LogEntry => ({
    id: row.id,
    foodId: row.food_id,
    meal: row.meal,
    portionId: row.portion_id,
    quantity: row.quantity,
    grams: row.grams,
    foodName: row.food_name,
    nutrients: { kcal: row.kcal, protein: row.protein, carbs: row.carbs, fat: row.fat },
    createdAt: row.created_at,
  }))

/** design §5: one cache entry per day, shared by Hoy and the optimistic adds. */
export const dayKey = (date: string) => ['day', date] as const

/** The day's logs in the order they were added. */
export function useDayLogs(date: string) {
  return useQuery({
    queryKey: dayKey(date),
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase
        .from('food_logs')
        .select(
          'id, food_id, meal, portion_id, quantity, grams, food_name, kcal, protein, carbs, fat, created_at',
        )
        .eq('log_date', date)
        .order('created_at')
        .abortSignal(signal)
      if (error) throw error
      return z.array(logEntrySchema).parse(data)
    },
  })
}

export type NewLog = {
  date: string
  meal: Meal
  foodId: string
  /** Null when logging plain grams. */
  portionId: string | null
  /** Number of portions, or grams when there is no portion. */
  quantity: number
  grams: number
  foodName: string
  /** R-02: what those grams contain, computed with src/domain/nutrition. */
  nutrients: Nutrients
}

/**
 * Logs a food (L-3). The entry shows up in Hoy before the server answers and
 * goes away again if saving fails. The id is made here, so the optimistic
 * entry already has its final id (HU-06 can delete it right away).
 */
export function useAddLog() {
  const queryClient = useQueryClient()
  return useMutation({
    // Callers pass `id: crypto.randomUUID()`.
    mutationFn: async (log: NewLog & { id: string }) => {
      const { error } = await supabase.from('food_logs').insert({
        id: log.id,
        food_id: log.foodId,
        log_date: log.date,
        meal: log.meal,
        portion_id: log.portionId,
        quantity: log.quantity,
        grams: log.grams,
        food_name: log.foodName,
        kcal: log.nutrients.kcal,
        protein: log.nutrients.protein,
        carbs: log.nutrients.carbs,
        fat: log.nutrients.fat,
      })
      if (error) throw error
    },
    onMutate: async (log) => {
      const key = dayKey(log.date)
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<LogEntry[]>(key)
      const entry: LogEntry = {
        id: log.id,
        foodId: log.foodId,
        meal: log.meal,
        portionId: log.portionId,
        quantity: log.quantity,
        grams: log.grams,
        foodName: log.foodName,
        nutrients: log.nutrients,
        createdAt: new Date().toISOString(),
      }
      // A day never loaded is fetched when Hoy opens; nothing to patch then.
      if (previous) queryClient.setQueryData<LogEntry[]>(key, [...previous, entry])
      return { previous }
    },
    onError: (_error, log, context) => {
      if (context?.previous) queryClient.setQueryData(dayKey(log.date), context.previous)
    },
    onSettled: (_data, _error, log) => {
      void queryClient.invalidateQueries({ queryKey: dayKey(log.date) })
      void queryClient.invalidateQueries({ queryKey: foodKeys.recent })
    },
  })
}
