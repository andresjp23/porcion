// R-13: suggested macro split, its energy, and how well manual macros match
// the kcal target.
import type { Nutrients } from './nutrition'

/** Grams of protein, carbs and fat. */
export type Macros = Pick<Nutrients, 'protein' | 'carbs' | 'fat'>

/** R-13 suggestion parameters. */
export const PROTEIN_G_PER_KG = 1.6
export const FAT_SHARE_OF_TARGET = 0.3

/** Atwater factors, kcal per gram (also used by R-07). */
export const KCAL_PER_GRAM: Macros = { protein: 4, carbs: 4, fat: 9 }

/** R-13: manual macros are whole grams between 0 and 1000. */
export const MAX_MACRO_GRAMS = 1000

/** R-13: manual macros may differ from the target by up to 5 % before a notice. */
export const TARGET_TOLERANCE = 0.05

/**
 * R-13: protein 1.6 g/kg, fat 30 % of the target and carbs the rest (never
 * negative), in whole grams because that is what the profile stores.
 */
export function suggestedMacros(kcalTarget: number, weightKg: number): Macros {
  if (!Number.isFinite(kcalTarget) || kcalTarget <= 0) {
    throw new RangeError(`kcalTarget must be a finite number > 0, got ${kcalTarget}`)
  }
  if (!Number.isFinite(weightKg) || weightKg <= 0) {
    throw new RangeError(`weightKg must be a finite number > 0, got ${weightKg}`)
  }
  const protein = weightKg * PROTEIN_G_PER_KG
  const fat = (kcalTarget * FAT_SHARE_OF_TARGET) / KCAL_PER_GRAM.fat
  const remaining = kcalTarget - protein * KCAL_PER_GRAM.protein - fat * KCAL_PER_GRAM.fat
  const carbs = Math.max(0, remaining / KCAL_PER_GRAM.carbs)
  return { protein: Math.round(protein), carbs: Math.round(carbs), fat: Math.round(fat) }
}

/** `4·protein + 4·carbs + 9·fat`. */
export function kcalFromMacros({ protein, carbs, fat }: Macros) {
  return protein * KCAL_PER_GRAM.protein + carbs * KCAL_PER_GRAM.carbs + fat * KCAL_PER_GRAM.fat
}

/** Share of the macros' own energy that each one provides, from 0 to 1. */
export function macroEnergyShares(macros: Macros): Macros {
  const total = kcalFromMacros(macros)
  if (total === 0) return { protein: 0, carbs: 0, fat: 0 }
  return {
    protein: (macros.protein * KCAL_PER_GRAM.protein) / total,
    carbs: (macros.carbs * KCAL_PER_GRAM.carbs) / total,
    fat: (macros.fat * KCAL_PER_GRAM.fat) / total,
  }
}

/** R-13: whole grams between 0 and 1000. */
export function isValidMacroGrams(grams: number) {
  return Number.isInteger(grams) && grams >= 0 && grams <= MAX_MACRO_GRAMS
}

export type TargetCoherence = {
  kcalFromMacros: number
  /** `kcalFromMacros − kcalTarget`: positive when the macros add up to more. */
  difference: number
  /** False when the difference exceeds 5 % of the target and a notice is due. */
  isCoherent: boolean
}

/** R-13: compares the energy of the macros with the kcal target. */
export function checkTargetCoherence(macros: Macros, kcalTarget: number): TargetCoherence {
  const fromMacros = kcalFromMacros(macros)
  const difference = fromMacros - kcalTarget
  return {
    kcalFromMacros: fromMacros,
    difference,
    isCoherent: Math.abs(difference) <= kcalTarget * TARGET_TOLERANCE,
  }
}
