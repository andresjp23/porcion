import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export const profileKey = (userId: string) => ['profile', userId] as const

/** The signed-in user's profile row, or null if it does not exist. */
export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: profileKey(userId ?? ''),
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId ?? '')
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}
