import {
  checkTargetCoherence,
  isValidMacroGrams,
  kcalFromMacros,
  macroEnergyShares,
  suggestedMacros,
} from './macros'

describe('suggestedMacros', () => {
  it('uses 1.6 g/kg protein, 30 % fat and carbs for the rest (R-13)', () => {
    // protein 128 g (512 kcal), fat 600 kcal → 66.7 g, carbs (2000 − 512 − 600) / 4 = 222 g
    expect(suggestedMacros(2000, 80)).toEqual({ protein: 128, carbs: 222, fat: 67 })
  })

  it('returns whole grams', () => {
    const result = suggestedMacros(2150, 72.5)
    expect(Object.values(result).every(Number.isInteger)).toBe(true)
  })

  it('stays close to the target it was computed from', () => {
    const result = suggestedMacros(2740, 80)
    expect(Math.abs(kcalFromMacros(result) - 2740)).toBeLessThan(10)
  })

  it('never suggests negative carbs', () => {
    // protein alone is 960 kcal and fat 360 kcal, above the 1200 kcal target
    expect(suggestedMacros(1200, 150).carbs).toBe(0)
  })

  it.each([
    [0, 80],
    [2000, 0],
    [Number.NaN, 80],
  ])('rejects target %s with weight %s', (kcal, weight) => {
    expect(() => suggestedMacros(kcal, weight)).toThrow(RangeError)
  })
})

describe('kcalFromMacros', () => {
  it('applies 4/4/9', () => {
    expect(kcalFromMacros({ protein: 100, carbs: 200, fat: 50 })).toBe(1650)
    expect(kcalFromMacros({ protein: 0, carbs: 0, fat: 0 })).toBe(0)
  })
})

describe('macroEnergyShares', () => {
  it('returns the share of energy from each macro', () => {
    const shares = macroEnergyShares({ protein: 100, carbs: 200, fat: 50 })
    expect(shares.protein).toBeCloseTo(400 / 1650)
    expect(shares.carbs).toBeCloseTo(800 / 1650)
    expect(shares.fat).toBeCloseTo(450 / 1650)
    expect(shares.protein + shares.carbs + shares.fat).toBeCloseTo(1)
  })

  it('returns zeros when every macro is 0', () => {
    expect(macroEnergyShares({ protein: 0, carbs: 0, fat: 0 })).toEqual({
      protein: 0,
      carbs: 0,
      fat: 0,
    })
  })
})

describe('isValidMacroGrams', () => {
  it('accepts whole grams from 0 to 1000 (R-13)', () => {
    expect(isValidMacroGrams(0)).toBe(true)
    expect(isValidMacroGrams(1000)).toBe(true)
    expect(isValidMacroGrams(-1)).toBe(false)
    expect(isValidMacroGrams(1001)).toBe(false)
    expect(isValidMacroGrams(12.5)).toBe(false)
    expect(isValidMacroGrams(Number.NaN)).toBe(false)
  })
})

describe('checkTargetCoherence', () => {
  it('is coherent within 5 % of the target (R-13)', () => {
    // 1950 kcal against 2000: 2.5 % off
    const result = checkTargetCoherence({ protein: 100, carbs: 275, fat: 50 }, 2000)
    expect(result.kcalFromMacros).toBe(1950)
    expect(result.difference).toBe(-50)
    expect(result.isCoherent).toBe(true)
  })

  it('accepts exactly 5 %', () => {
    // 2100 kcal against 2000
    expect(checkTargetCoherence({ protein: 100, carbs: 312.5, fat: 50 }, 2000).isCoherent).toBe(
      true,
    )
  })

  it('flags a difference above 5 %, in either direction', () => {
    // 1650 kcal against 2100 and 2400 kcal against 2100
    expect(checkTargetCoherence({ protein: 100, carbs: 200, fat: 50 }, 2100).isCoherent).toBe(false)
    const over = checkTargetCoherence({ protein: 150, carbs: 337.5, fat: 50 }, 2100)
    expect(over.difference).toBe(300)
    expect(over.isCoherent).toBe(false)
  })
})
