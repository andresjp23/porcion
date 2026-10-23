import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/useAuth'
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

/** profiles.timezone defaults to Santiago; also used while the profile loads. */
export const DEFAULT_TIME_ZONE = 'America/Santiago'

/** The signed-in user's IANA time zone, for local dates (R-09, HU-03). */
export function useTimeZone() {
  const auth = useAuth()
  const profile = useProfile(auth.status === 'signedIn' ? auth.session.user.id : undefined)
  return profile.data?.timezone ?? DEFAULT_TIME_ZONE
}
