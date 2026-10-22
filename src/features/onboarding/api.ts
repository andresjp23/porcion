import { useQuery } from '@tanstack/react-query'
import { localDate } from '@/domain/dates'
import type { TablesUpdate } from '@/lib/database.types'
import { supabase } from '@/lib/supabase'

export const latestWeightKey = (userId: string) => ['weight', 'latest', userId] as const

/** The most recent weight entry, or null if there is none yet. */
export function useLatestWeight(userId: string | undefined) {
  return useQuery({
    queryKey: latestWeightKey(userId ?? ''),
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('weight_entries')
        .select('date, weight_kg')
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

/** Saves onboarding answers on the own profile. Throws if nothing was saved. */
export async function updateProfile(userId: string, values: TablesUpdate<'profiles'>) {
  const { data, error } = await supabase
    .from('profiles')
    .update(values)
    .eq('id', userId)
    .select('id')
  if (error) throw error
  if (data.length === 0) throw new Error('Profile not found')
}

/** HU-13 CA1: one weight per day in the user's time zone; saving again replaces it. */
export async function saveWeightForToday(weightKg: number, timeZone: string) {
  const { error } = await supabase
    .from('weight_entries')
    .upsert(
      { date: localDate(new Date(), timeZone), weight_kg: weightKg },
      { onConflict: 'user_id,date' },
    )
  if (error) throw error
}
