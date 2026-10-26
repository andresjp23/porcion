import { suggestedMacros, type Macros } from './macros'

/** The daily target as the profile stores it, with its two "set by hand" marks (R-13). */
export type SavedTarget = Macros & {
  kcal: number
  kcalIsManual: boolean
  macrosAreManual: boolean
}

function sameMacros(a: Macros, b: Macros) {
  return a.protein === b.protein && a.carbs === b.carbs && a.fat === b.fat
}

/**
 * "Usar lo sugerido" for the kcal target: takes the suggestion and clears its
 * manual mark. Macros not set by hand follow the new target.
 */
export function withSuggestedKcal(
  target: SavedTarget,
  suggestedKcal: number,
  weightKg: number,
): SavedTarget {
  const next = { ...target, kcal: suggestedKcal, kcalIsManual: false }
  return next.macrosAreManual ? next : { ...next, ...suggestedMacros(suggestedKcal, weightKg) }
}

/** "Usar lo sugerido" for the macros: the suggestion for the current kcal target. */
export function withSuggestedMacros(target: SavedTarget, weightKg: number): SavedTarget {
  return { ...target, ...suggestedMacros(target.kcal, weightKg), macrosAreManual: false }
}

export type Recalculation = {
  /** What to save: everything not set by hand, brought up to date. */
  next: SavedTarget
  /** The suggested kcal target, when the user's own differs from it. */
  kcalOffer: number | null
  /** The suggested macros for `next.kcal`, when the user's own differ from them. */
  macrosOffer: Macros | null
}

/**
 * R-13 "Recalcular": only what is not set by hand is updated. What is set by
 * hand stays, and its suggestion is returned so the user can choose to take it.
 */
export function recalculateTarget(
  saved: SavedTarget,
  suggestedKcal: number,
  weightKg: number,
): Recalculation {
  const withKcal = saved.kcalIsManual ? saved : withSuggestedKcal(saved, suggestedKcal, weightKg)
  const next = withKcal.macrosAreManual ? withKcal : withSuggestedMacros(withKcal, weightKg)
  const macrosForKcal = suggestedMacros(next.kcal, weightKg)
  return {
    next,
    kcalOffer: saved.kcalIsManual && saved.kcal !== suggestedKcal ? suggestedKcal : null,
    macrosOffer: next.macrosAreManual && !sameMacros(next, macrosForKcal) ? macrosForKcal : null,
  }
}

/** Whether saving `b` instead of `a` changes anything. */
export function sameTarget(a: SavedTarget, b: SavedTarget) {
  return (
    a.kcal === b.kcal &&
    sameMacros(a, b) &&
    a.kcalIsManual === b.kcalIsManual &&
    a.macrosAreManual === b.macrosAreManual
  )
}
