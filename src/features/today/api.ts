import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import type { Meal } from '@/domain/meal'
import type { Nutrients } from '@/domain/nutrition'
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
