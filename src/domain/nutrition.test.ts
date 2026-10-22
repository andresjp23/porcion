import {
  gramsForPortion,
  nutrientsForGrams,
  nutrientsForPortion,
  type Nutrients,
} from './nutrition'

// Marraqueta, per 100 g
const bread: Nutrients = { kcal: 267, protein: 8.6, carbs: 55.4, fat: 1.2 }

describe('nutrientsForGrams', () => {
  it('scales every nutrient by grams / 100 (R-02)', () => {
    const result = nutrientsForGrams(bread, 50)
    expect(result.kcal).toBeCloseTo(133.5)
    expect(result.protein).toBeCloseTo(4.3)
    expect(result.carbs).toBeCloseTo(27.7)
    expect(result.fat).toBeCloseTo(0.6)
  })

  it('returns the per-100 values for 100 g', () => {
    expect(nutrientsForGrams(bread, 100)).toEqual(bread)
  })

  it('returns zeros for 0 g', () => {
    expect(nutrientsForGrams(bread, 0)).toEqual({ kcal: 0, protein: 0, carbs: 0, fat: 0 })
  })

  it('does not round', () => {
    expect(nutrientsForGrams(bread, 33).kcal).toBeCloseTo(88.11, 10)
  })

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])('rejects %s grams', (grams) => {
    expect(() => nutrientsForGrams(bread, grams)).toThrow(RangeError)
  })
})

describe('gramsForPortion', () => {
  it('multiplies the portion weight by the quantity', () => {
    expect(gramsForPortion({ grams: 200 }, 1.5)).toBe(300)
    expect(gramsForPortion({ grams: 100 }, 0.5)).toBe(50)
  })

  it('rejects negative quantities or weights', () => {
    expect(() => gramsForPortion({ grams: 100 }, -1)).toThrow(RangeError)
    expect(() => gramsForPortion({ grams: -100 }, 1)).toThrow(RangeError)
  })
})

describe('nutrientsForPortion', () => {
  it('computes nutrients for a number of portions (R-01)', () => {
    // 2 × "1 unidad" (100 g) = 200 g
    const result = nutrientsForPortion(bread, { grams: 100 }, 2)
    expect(result.kcal).toBeCloseTo(534)
    expect(result.protein).toBeCloseTo(17.2)
    expect(result.carbs).toBeCloseTo(110.8)
    expect(result.fat).toBeCloseTo(2.4)
  })
})
