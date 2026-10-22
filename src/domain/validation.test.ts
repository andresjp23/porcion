import type { Nutrients } from './nutrition'
import { checkAtwater, nutrientIssues } from './validation'

// Leche entera, per 100 ml
const milk: Nutrients = { kcal: 61, protein: 3.2, carbs: 4.7, fat: 3.3 }

describe('checkAtwater', () => {
  it('estimates kcal with 4/4/9 (R-07)', () => {
    const result = checkAtwater(milk)
    // 12.8 + 18.8 + 29.7
    expect(result.estimatedKcal).toBeCloseTo(61.3)
    expect(result.difference).toBeCloseTo(-0.3)
    expect(result.isConsistent).toBe(true)
  })

  it('allows up to 15 kcal on low-calorie foods', () => {
    // estimated 0, declared 15
    expect(checkAtwater({ kcal: 15, protein: 0, carbs: 0, fat: 0 }).isConsistent).toBe(true)
    expect(checkAtwater({ kcal: 16, protein: 0, carbs: 0, fat: 0 }).isConsistent).toBe(false)
  })

  it('allows up to 15 % of the declared kcal on energy-dense foods', () => {
    // estimated 400; 15 % of 460 is 69, so 60 off is fine and 80 off is not
    expect(checkAtwater({ kcal: 460, protein: 0, carbs: 100, fat: 0 }).isConsistent).toBe(true)
    expect(checkAtwater({ kcal: 320, protein: 0, carbs: 100, fat: 0 }).isConsistent).toBe(false)
  })

  it('warns when the label declares far less than its macros', () => {
    const result = checkAtwater({ kcal: 100, protein: 10, carbs: 30, fat: 10 })
    expect(result.difference).toBeCloseTo(-150)
    expect(result.isConsistent).toBe(false)
  })
})

describe('nutrientIssues', () => {
  it('accepts valid values', () => {
    expect(nutrientIssues(milk)).toEqual([])
    expect(nutrientIssues({ kcal: 900, protein: 0, carbs: 0, fat: 100 })).toEqual([])
    expect(nutrientIssues({ kcal: 0, protein: 0, carbs: 0, fat: 0 })).toEqual([])
  })

  it('rejects negative, non-finite and too-high values', () => {
    expect(nutrientIssues({ kcal: -1, protein: Number.NaN, carbs: 101, fat: 3 })).toEqual([
      { field: 'kcal', code: 'negative' },
      { field: 'protein', code: 'invalid' },
      { field: 'carbs', code: 'too_high' },
    ])
    expect(nutrientIssues({ ...milk, kcal: 901 })).toEqual([{ field: 'kcal', code: 'too_high' }])
  })

  it('rejects macros adding up to more than 100 g', () => {
    expect(nutrientIssues({ kcal: 500, protein: 40, carbs: 50, fat: 20 })).toEqual([
      { field: 'macros', code: 'macros_over_100' },
    ])
  })
})
