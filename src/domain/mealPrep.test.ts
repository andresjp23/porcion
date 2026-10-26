import {
  batchGrams,
  cookedWeightLooksOff,
  daysSinceCooked,
  isFinished,
  per100Cooked,
  rawGrams,
  remainingGrams,
  servingGrams,
  servingsLeft,
  shouldCheckFreshness,
  totalNutrients,
  type MealPrep,
} from './mealPrep'
import { nutrientsForGrams, type Nutrients } from './nutrition'

// Raw chicken breast and spray oil, per 100 g.
const chicken: Nutrients = { kcal: 110, protein: 23, carbs: 0, fat: 1.5 }
const oil: Nutrients = { kcal: 884, protein: 0, carbs: 0, fat: 100 }

// Two 850 g trays on the griddle, with a little spray oil: 1,275 g once cooked.
const grilledChicken: MealPrep = {
  ingredients: [
    { per100: chicken, grams: 1700 },
    { per100: oil, grams: 3 },
  ],
  cookedGrams: 1275,
  servings: null,
  finishedByHand: false,
  loggedGrams: 0,
}

describe('totalNutrients', () => {
  it('adds up the raw ingredients: cooking changes the weight, not the energy', () => {
    const total = totalNutrients(grilledChicken.ingredients)
    expect(total.kcal).toBeCloseTo(1870 + 26.52)
    expect(total.protein).toBeCloseTo(391)
    expect(total.fat).toBeCloseTo(25.5 + 3)
  })
})

describe('per100Cooked', () => {
  it('divides the batch by its cooked weight (R-14)', () => {
    const per100 = per100Cooked(grilledChicken)
    expect(per100.kcal).toBeCloseTo(148.75, 2)
    expect(per100.protein).toBeCloseTo(30.67, 2)
  })

  it('gives what a 150 g plate really has, more than the raw label says', () => {
    const plate = nutrientsForGrams(per100Cooked(grilledChicken), 150)
    expect(plate.kcal).toBeCloseTo(223.1, 1)
    expect(plate.protein).toBeCloseTo(46, 0)
    expect(nutrientsForGrams(chicken, 150).kcal).toBeCloseTo(165)
  })

  it('falls back to the raw weight without a cooked one (HU-17 CA3)', () => {
    const prep = { ...grilledChicken, cookedGrams: null }
    expect(batchGrams(prep)).toBe(1703)
    expect(per100Cooked(prep).kcal).toBeCloseTo((1896.52 * 100) / 1703)
  })

  it('also works when cooking adds water, as with rice', () => {
    const rice: Nutrients = { kcal: 360, protein: 6.6, carbs: 79, fat: 0.6 }
    const per100 = per100Cooked({ ingredients: [{ per100: rice, grams: 200 }], cookedGrams: 600 })
    expect(per100.kcal).toBeCloseTo(120)
  })
})

describe('servingGrams and servingsLeft', () => {
  const inTuppers = { ...grilledChicken, servings: 5 }

  it('splits the cooked weight into equal servings', () => {
    expect(servingGrams(inTuppers)).toBe(255)
  })

  it('is null when the batch was not split', () => {
    expect(servingGrams(grilledChicken)).toBeNull()
    expect(servingsLeft(grilledChicken)).toBeNull()
  })

  it('counts the servings the remaining grams still give', () => {
    expect(servingsLeft({ ...inTuppers, loggedGrams: 510 })).toBe(3)
    expect(servingsLeft({ ...inTuppers, loggedGrams: 600 })).toBeCloseTo(2.65, 2)
  })
})

describe('remainingGrams and isFinished', () => {
  it('subtracts what was already logged', () => {
    expect(remainingGrams({ ...grilledChicken, loggedGrams: 330 })).toBe(945)
    expect(isFinished({ ...grilledChicken, loggedGrams: 330 })).toBe(false)
  })

  it('stops at 0 when more was logged than cooked (HU-18 CA4) and finishes', () => {
    const overLogged = { ...grilledChicken, loggedGrams: 1300 }
    expect(remainingGrams(overLogged)).toBe(0)
    expect(isFinished(overLogged)).toBe(true)
  })

  it('finishes when the remaining weight reaches exactly 0', () => {
    expect(isFinished({ ...grilledChicken, loggedGrams: 1275 })).toBe(true)
  })

  it('finishes by hand even with grams left (HU-19 CA1)', () => {
    expect(isFinished({ ...grilledChicken, finishedByHand: true, loggedGrams: 200 })).toBe(true)
  })

  it('comes back when a log is removed, since it is derived', () => {
    expect(isFinished({ ...grilledChicken, loggedGrams: 1125 })).toBe(false)
  })
})

describe('cookedWeightLooksOff', () => {
  it('warns when the cooked weight is over 3× the raw one (no tare?)', () => {
    expect(cookedWeightLooksOff(grilledChicken.ingredients, 5200)).toBe(true)
  })

  it('accepts rice tripling its weight, and chicken losing water', () => {
    const rawRice = [{ per100: { kcal: 360, protein: 6.6, carbs: 79, fat: 0.6 }, grams: 200 }]
    expect(cookedWeightLooksOff(rawRice, 600)).toBe(false)
    expect(cookedWeightLooksOff(grilledChicken.ingredients, 1275)).toBe(false)
  })
})

describe('rawGrams', () => {
  it('sums the raw grams', () => {
    expect(rawGrams(grilledChicken.ingredients)).toBe(1703)
  })
})

describe('daysSinceCooked and shouldCheckFreshness (R-15)', () => {
  it('counts whole local days', () => {
    expect(daysSinceCooked('2026-10-26', '2026-10-26')).toBe(0)
    expect(daysSinceCooked('2026-10-26', '2026-10-27')).toBe(1)
    expect(daysSinceCooked('2026-10-28', '2026-11-02')).toBe(5)
  })

  it('is not thrown off by a daylight saving change in between', () => {
    // Chile moves its clocks in early September and early April.
    expect(daysSinceCooked('2026-09-04', '2026-09-08')).toBe(4)
    expect(daysSinceCooked('2026-04-03', '2026-04-07')).toBe(4)
  })

  it('never goes negative if the cooking day is ahead of today', () => {
    expect(daysSinceCooked('2026-10-27', '2026-10-26')).toBe(0)
  })

  it('adds the note from day 4', () => {
    expect(shouldCheckFreshness('2026-10-26', '2026-10-29')).toBe(false)
    expect(shouldCheckFreshness('2026-10-26', '2026-10-30')).toBe(true)
  })
})
