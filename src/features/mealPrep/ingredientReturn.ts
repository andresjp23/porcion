// MP-3b: scanning an ingredient leaves the meal prep form for the scanner (and
// maybe Crear alimento) and comes back. The form waits in sessionStorage,
// only on this device and only until the tab closes.
import type { MealPrepInput } from './mealPrepSchema'

const DRAFT_PREFIX = 'porcion-meal-prep-draft:'

/**
 * Only a meal prep form can be returned to: anything else in `?return=`,
 * such as another site, is ignored.
 */
export function parseMealPrepReturn(value: string | null) {
  return value !== null && /^\/meal-prep\/(new|[0-9a-f-]{36}\/edit)$/.test(value) ? value : null
}

/** Back to the form: it picks up its draft and, if there is one, the new ingredient. */
export function resumeHref(returnPath: string, foodId?: string) {
  const params = new URLSearchParams({ resume: '1' })
  if (foodId) params.set('ingredient', foodId)
  return `${returnPath}?${params.toString()}`
}

/** The scanner in ingredient mode, coming back to `returnPath`. */
export function scanIngredientHref(returnPath: string) {
  return `/scan?${new URLSearchParams({ return: returnPath }).toString()}`
}

export function saveDraft(returnPath: string, values: MealPrepInput) {
  try {
    sessionStorage.setItem(DRAFT_PREFIX + returnPath, JSON.stringify(values))
  } catch {
    // Private mode or full storage: coming back starts from the saved batch.
  }
}

/**
 * The draft, without removing it: React may read it twice while rendering.
 * Forms only read it on `?resume=1` and clear it once the batch is saved.
 */
export function readDraft(returnPath: string): MealPrepInput | null {
  try {
    const text = sessionStorage.getItem(DRAFT_PREFIX + returnPath)
    return text ? (JSON.parse(text) as MealPrepInput) : null
  } catch {
    return null
  }
}

export function clearDraft(returnPath: string) {
  try {
    sessionStorage.removeItem(DRAFT_PREFIX + returnPath)
  } catch {
    // Nothing to clear.
  }
}
