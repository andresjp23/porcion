// R-07 and the per-100 g ranges of `foods`: what a food's nutrients may be.
import { kcalFromMacros } from './macros'
import type { Nutrients } from './nutrition'

/** R-07 tolerance: the larger of 15 kcal and 15 % of the declared kcal. */
export const ATWATER_TOLERANCE_KCAL = 15
export const ATWATER_TOLERANCE_SHARE = 0.15

/** Per 100 g, pure fat is the most energy a food can have: 100 g × 9 kcal/g. */
export const MAX_KCAL_100 = 900
export const MAX_GRAMS_100 = 100

export type AtwaterCheck = {
  estimatedKcal: number
  /** `kcal − estimatedKcal`: positive when the label declares more. */
  difference: number
  /** False when the difference is large enough to warn (HU-09 CA3). */
  isConsistent: boolean
}

/** R-07: compares the declared kcal with `4·protein + 4·carbs + 9·fat`. */
export function checkAtwater(nutrients: Nutrients): AtwaterCheck {
  const estimatedKcal = kcalFromMacros(nutrients)
  const difference = nutrients.kcal - estimatedKcal
  const tolerance = Math.max(ATWATER_TOLERANCE_KCAL, nutrients.kcal * ATWATER_TOLERANCE_SHARE)
  return { estimatedKcal, difference, isConsistent: Math.abs(difference) <= tolerance }
}

export type NutrientField = keyof Nutrients

export type NutrientIssue =
  | { field: NutrientField; code: 'invalid' | 'negative' | 'too_high' }
  | { field: 'macros'; code: 'macros_over_100' }

/**
 * Hard limits per 100 g: every value finite and ≥ 0, kcal ≤ 900, each macro
 * ≤ 100 g and protein + carbs + fat ≤ 100 g. Unlike R-07, these block saving.
 */
export function nutrientIssues(per100: Nutrients): NutrientIssue[] {
  const issues: NutrientIssue[] = []
  const fields: NutrientField[] = ['kcal', 'protein', 'carbs', 'fat']
  for (const field of fields) {
    const value = per100[field]
    const max = field === 'kcal' ? MAX_KCAL_100 : MAX_GRAMS_100
    if (!Number.isFinite(value)) issues.push({ field, code: 'invalid' })
    else if (value < 0) issues.push({ field, code: 'negative' })
    else if (value > max) issues.push({ field, code: 'too_high' })
  }
  if (issues.length === 0 && per100.protein + per100.carbs + per100.fat > MAX_GRAMS_100) {
    issues.push({ field: 'macros', code: 'macros_over_100' })
  }
  return issues
}
