import { useMutation, useQueryClient } from '@tanstack/react-query'
import { saveWeightForToday } from '@/features/onboarding/api'

/** Every weight query starts with this key, so a save refreshes them all. */
export const weightKey = ['weight'] as const

/** HU-13 CA1: saves today's weight, replacing the one already there. */
export function useSaveWeight(timeZone: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (weightKg: number) => saveWeightForToday(weightKg, timeZone),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: weightKey }),
  })
}
