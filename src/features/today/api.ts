import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
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
  /** Null only when Deshacer restores a log whose food was deleted since. */
  foodId: string | null
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
 * Applies a change to a day's cached logs right away and returns how to undo
 * it. A day never loaded is fetched when Hoy opens, so there is nothing to patch.
 */
async function patchDay(
  queryClient: QueryClient,
  date: string,
  change: (entries: LogEntry[]) => LogEntry[],
) {
  const key = dayKey(date)
  await queryClient.cancelQueries({ queryKey: key })
  const previous = queryClient.getQueryData<LogEntry[]>(key)
  if (previous) queryClient.setQueryData<LogEntry[]>(key, change(previous))
  return () => {
    if (previous) queryClient.setQueryData(key, previous)
  }
}

type Rollback = { rollback: () => void }

/**
 * Logs a food (L-3). The entry shows up in Hoy before the server answers and
 * goes away again if saving fails. The id is made here, so the optimistic
 * entry already has its final id (HU-06 can delete it right away).
 */
export function useAddLog() {
  const queryClient = useQueryClient()
  return useMutation({
    // Callers pass `id: crypto.randomUUID()`. `createdAt` is only set when
    // Deshacer puts a deleted log back in its place (HU-06 CA2).
    mutationFn: async (log: NewLog & { id: string; createdAt?: string }) => {
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
        ...(log.createdAt ? { created_at: log.createdAt } : {}),
      })
      if (error) throw error
    },
    onMutate: async (log): Promise<Rollback> => {
      const entry: LogEntry = {
        id: log.id,
        foodId: log.foodId,
        meal: log.meal,
        portionId: log.portionId,
        quantity: log.quantity,
        grams: log.grams,
        foodName: log.foodName,
        nutrients: log.nutrients,
        createdAt: log.createdAt ?? new Date().toISOString(),
      }
      const rollback = await patchDay(queryClient, log.date, (entries) =>
        [...entries, entry].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
      )
      return { rollback }
    },
    onError: (_error, _log, context) => context?.rollback(),
    onSettled: (_data, _error, log) => {
      void queryClient.invalidateQueries({ queryKey: dayKey(log.date) })
      void queryClient.invalidateQueries({ queryKey: foodKeys.recent })
    },
  })
}

export type LogChanges = Pick<LogEntry, 'meal' | 'portionId' | 'quantity' | 'grams' | 'nutrients'>

/** HU-06 CA1: changes the amount or the meal of a log. */
export function useUpdateLog(date: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, changes }: { id: string; changes: LogChanges }) => {
      const { error } = await supabase
        .from('food_logs')
        .update({
          meal: changes.meal,
          portion_id: changes.portionId,
          quantity: changes.quantity,
          grams: changes.grams,
          kcal: changes.nutrients.kcal,
          protein: changes.nutrients.protein,
          carbs: changes.nutrients.carbs,
          fat: changes.nutrients.fat,
        })
        .eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, changes }): Promise<Rollback> => ({
      rollback: await patchDay(queryClient, date, (entries) =>
        entries.map((entry) => (entry.id === id ? { ...entry, ...changes } : entry)),
      ),
    }),
    onError: (_error, _variables, context) => context?.rollback(),
    onSettled: () => void queryClient.invalidateQueries({ queryKey: dayKey(date) }),
  })
}

/** HU-06: deletes a log. Deshacer puts it back with useAddLog. */
export function useDeleteLog(date: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (entry: LogEntry) => {
      const { error } = await supabase.from('food_logs').delete().eq('id', entry.id)
      if (error) throw error
    },
    onMutate: async (entry): Promise<Rollback> => ({
      rollback: await patchDay(queryClient, date, (entries) =>
        entries.filter((e) => e.id !== entry.id),
      ),
    }),
    onError: (_error, _entry, context) => context?.rollback(),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: dayKey(date) })
      void queryClient.invalidateQueries({ queryKey: foodKeys.recent })
    },
  })
}
