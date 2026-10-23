import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { addDays } from '@/domain/dates'
import type { WeightEntry } from '@/domain/trend'
import { saveWeightForToday } from '@/features/onboarding/api'
import { logRangeKey } from '@/features/today/api'
import { supabase } from '@/lib/supabase'

/** Every weight query starts with this key, so a save refreshes them all. */
export const weightKey = ['weight'] as const

const weightRowSchema = z
  .object({ date: z.string(), weight_kg: z.number() })
  .transform((row): WeightEntry => ({ date: row.date, weightKg: row.weight_kg }))

/**
 * Every weight of the user, oldest first. The trend needs the ones before the
 * period too (R-06), and one entry per day keeps this small.
 */
export function useWeightHistory() {
  return useQuery({
    queryKey: [...weightKey, 'history'],
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase
        .from('weight_entries')
        .select('date, weight_kg')
        .order('date')
        .abortSignal(signal)
      if (error) throw error
      return z.array(weightRowSchema).parse(data)
    },
  })
}

const kcalRowSchema = z
  .object({ log_date: z.string(), kcal: z.number() })
  .transform((row) => ({ date: row.log_date, kcal: row.kcal }))

/** HU-14 CA3: the kcal of each log in the 7 days that end today. */
export function useWeekLogs(today: string) {
  return useQuery({
    queryKey: [...logRangeKey, addDays(today, -6), today],
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase
        .from('food_logs')
        .select('log_date, kcal')
        .gte('log_date', addDays(today, -6))
        .lte('log_date', today)
        .abortSignal(signal)
      if (error) throw error
      return z.array(kcalRowSchema).parse(data)
    },
  })
}

/** HU-13 CA1: saves today's weight, replacing the one already there. */
export function useSaveWeight(timeZone: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (weightKg: number) => saveWeightForToday(weightKg, timeZone),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: weightKey }),
  })
}
