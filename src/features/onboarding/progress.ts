import type { Tables } from '@/lib/database.types'

export const ONBOARDING_STEPS = 5

type OnboardingProfile = Pick<
  Tables<'profiles'>,
  'sex' | 'birth_date' | 'height_cm' | 'activity' | 'goal'
>

/**
 * The first step with missing answers (5 when all are in), so a typed URL
 * cannot skip ahead. Answers are saved on every "Continuar".
 */
export function firstIncompleteStep(profile: OnboardingProfile, hasWeight: boolean) {
  if (!profile.sex || !profile.birth_date) return 1
  if (profile.height_cm === null || !hasWeight) return 2
  if (!profile.activity) return 3
  if (!profile.goal) return 4
  return 5
}

/** The step in the URL if it is a number from 1 to 5, otherwise null. */
export function parseStep(param: string | undefined) {
  const step = Number(param)
  return Number.isInteger(step) && step >= 1 && step <= ONBOARDING_STEPS ? step : null
}
