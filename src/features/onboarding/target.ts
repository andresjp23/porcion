import { ageInYears, type TargetInput } from '@/domain/energy'
import { suggestedMacros, type Macros } from '@/domain/macros'
import type { SavedTarget } from '@/domain/target'
import type { Tables } from '@/lib/database.types'

/** The data for R-03/R-04 from the saved answers, or null if any is missing. */
export function targetInputFrom(
  profile: Pick<Tables<'profiles'>, 'sex' | 'birth_date' | 'height_cm' | 'activity' | 'goal'>,
  weightKg: number | null,
  today: string,
): TargetInput | null {
  const { sex, birth_date, height_cm, activity, goal } = profile
  if (!sex || !birth_date || height_cm === null || !activity || !goal || weightKg === null) {
    return null
  }
  return {
    sex,
    weightKg,
    heightCm: height_cm,
    ageYears: ageInYears(birth_date, today),
    activity,
    goal,
  }
}

export type DailyTarget = SavedTarget

/**
 * R-13: the kcal target is manual when it differs from the suggestion, and the
 * macros are manual when they differ from what would be suggested for that kcal.
 */
export function classifyTarget(
  values: Macros & { kcal: number },
  suggestedKcal: number,
  weightKg: number,
): DailyTarget {
  const forKcal = suggestedMacros(values.kcal, weightKg)
  return {
    ...values,
    kcalIsManual: values.kcal !== suggestedKcal,
    macrosAreManual:
      values.protein !== forKcal.protein ||
      values.carbs !== forKcal.carbs ||
      values.fat !== forKcal.fat,
  }
}
