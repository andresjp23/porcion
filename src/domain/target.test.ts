import { suggestedMacros } from './macros'
import {
  recalculateTarget,
  sameTarget,
  withSuggestedKcal,
  withSuggestedMacros,
  type SavedTarget,
} from './target'

const suggested = (kcal: number, weightKg = 80): SavedTarget => ({
  kcal,
  ...suggestedMacros(kcal, weightKg),
  kcalIsManual: false,
  macrosAreManual: false,
})

describe('recalculateTarget', () => {
  it('updates everything when nothing is set by hand', () => {
    const result = recalculateTarget(suggested(2240), 2100, 78)
    expect(result.next).toEqual(suggested(2100, 78))
    expect(result.kcalOffer).toBeNull()
    expect(result.macrosOffer).toBeNull()
  })

  it('keeps a manual kcal target, offers the suggestion and re-suggests macros on it', () => {
    const saved = { ...suggested(1800), kcalIsManual: true }
    const result = recalculateTarget(saved, 2100, 78)
    expect(result.next).toEqual({ ...suggested(1800, 78), kcalIsManual: true })
    expect(result.kcalOffer).toBe(2100)
    expect(result.macrosOffer).toBeNull()
  })

  it('does not offer the kcal suggestion when the manual target already matches it', () => {
    const saved = { ...suggested(2100), kcalIsManual: true }
    expect(recalculateTarget(saved, 2100, 80).kcalOffer).toBeNull()
  })

  it('keeps manual macros, updates the kcal target and offers macros for it', () => {
    const saved = { ...suggested(2240), protein: 150, carbs: 200, fat: 70, macrosAreManual: true }
    const result = recalculateTarget(saved, 2100, 80)
    expect(result.next).toEqual({ ...saved, kcal: 2100 })
    expect(result.kcalOffer).toBeNull()
    expect(result.macrosOffer).toEqual(suggestedMacros(2100, 80))
  })

  it('keeps both when both are set by hand', () => {
    const saved = {
      kcal: 1800,
      protein: 150,
      carbs: 150,
      fat: 60,
      kcalIsManual: true,
      macrosAreManual: true,
    }
    const result = recalculateTarget(saved, 2100, 80)
    expect(result.next).toEqual(saved)
    expect(result.kcalOffer).toBe(2100)
    expect(result.macrosOffer).toEqual(suggestedMacros(1800, 80))
  })

  it('offers nothing for manual macros that equal the suggestion', () => {
    const saved = { ...suggested(2100), macrosAreManual: true }
    expect(recalculateTarget(saved, 2100, 80).macrosOffer).toBeNull()
  })
})

describe('withSuggestedKcal', () => {
  it('clears the manual mark and moves the macros along', () => {
    const saved = { ...suggested(1800), kcalIsManual: true }
    expect(withSuggestedKcal(saved, 2240, 80)).toEqual(suggested(2240))
  })

  it('leaves manual macros alone', () => {
    const saved = {
      kcal: 1800,
      protein: 150,
      carbs: 150,
      fat: 60,
      kcalIsManual: true,
      macrosAreManual: true,
    }
    expect(withSuggestedKcal(saved, 2240, 80)).toEqual({
      ...saved,
      kcal: 2240,
      kcalIsManual: false,
    })
  })
})

describe('withSuggestedMacros', () => {
  it('suggests macros on the current target, manual or not', () => {
    const saved = {
      kcal: 1800,
      protein: 150,
      carbs: 150,
      fat: 60,
      kcalIsManual: true,
      macrosAreManual: true,
    }
    expect(withSuggestedMacros(saved, 80)).toEqual({ ...suggested(1800), kcalIsManual: true })
  })
})

describe('sameTarget', () => {
  it('compares values and marks', () => {
    expect(sameTarget(suggested(2100), suggested(2100))).toBe(true)
    expect(sameTarget(suggested(2100), { ...suggested(2100), kcalIsManual: true })).toBe(false)
    expect(sameTarget(suggested(2100), { ...suggested(2100), fat: 1 })).toBe(false)
  })
})
