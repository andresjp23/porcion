import {
  ageInYears,
  basalMetabolicRate,
  isBelowFloor,
  suggestedTarget,
  type TargetInput,
} from './energy'

const man: TargetInput = {
  sex: 'male',
  weightKg: 80,
  heightCm: 178,
  ageYears: 30,
  activity: 'moderate',
  goal: 'maintain',
}

describe('basalMetabolicRate', () => {
  it('uses Mifflin-St Jeor for men (R-03)', () => {
    // 800 + 1112.5 − 150 + 5
    expect(basalMetabolicRate(man)).toBeCloseTo(1767.5)
  })

  it('uses Mifflin-St Jeor for women (R-03)', () => {
    // 600 + 1012.5 − 175 − 161
    expect(
      basalMetabolicRate({ sex: 'female', weightKg: 60, heightCm: 162, ageYears: 35 }),
    ).toBeCloseTo(1276.5)
  })

  it.each([
    ['weightKg', { weightKg: 0 }],
    ['heightCm', { heightCm: -1 }],
    ['ageYears', { ageYears: Number.NaN }],
  ])('rejects an invalid %s', (_, override) => {
    expect(() => basalMetabolicRate({ ...man, ...override })).toThrow(RangeError)
  })
})

describe('suggestedTarget', () => {
  it('multiplies by the activity factor and rounds to the nearest ten (R-04)', () => {
    const result = suggestedTarget(man)
    expect(result.activityFactor).toBe(1.55)
    expect(result.tdee).toBeCloseTo(2739.625)
    expect(result.goalAdjustment).toBe(0)
    expect(result.kcal).toBe(2740)
    expect(result.floorApplied).toBe(false)
  })

  it.each([
    ['lose', 2240],
    ['maintain', 2740],
    ['gain', 2990],
  ] as const)('applies the %s adjustment (R-04)', (goal, kcal) => {
    expect(suggestedTarget({ ...man, goal }).kcal).toBe(kcal)
  })

  it.each([
    ['sedentary', 1.2],
    ['light', 1.375],
    ['moderate', 1.55],
    ['high', 1.725],
    ['very_high', 1.9],
  ] as const)('uses factor %s = %s', (activity, factor) => {
    expect(suggestedTarget({ ...man, activity }).activityFactor).toBe(factor)
  })

  it('uses the female floor of 1200 kcal and flags it (R-05)', () => {
    // BMR 1033.75 × 1.2 − 500 ≈ 740
    const result = suggestedTarget({
      sex: 'female',
      weightKg: 45,
      heightCm: 150,
      ageYears: 60,
      activity: 'sedentary',
      goal: 'lose',
    })
    expect(result.kcal).toBe(1200)
    expect(result.floorApplied).toBe(true)
  })

  it('uses the male floor of 1500 kcal and flags it (R-05)', () => {
    const result = suggestedTarget({
      ...man,
      weightKg: 55,
      heightCm: 160,
      ageYears: 70,
      activity: 'sedentary',
      goal: 'lose',
    })
    expect(result.kcal).toBe(1500)
    expect(result.floorApplied).toBe(true)
  })
})

describe('isBelowFloor', () => {
  it('compares a manual target with the floor for the sex (R-05)', () => {
    expect(isBelowFloor(1450, 'male')).toBe(true)
    expect(isBelowFloor(1500, 'male')).toBe(false)
    expect(isBelowFloor(1199, 'female')).toBe(true)
    expect(isBelowFloor(1200, 'female')).toBe(false)
  })
})

describe('ageInYears', () => {
  it('counts full years', () => {
    expect(ageInYears('1990-05-15', '2026-05-14')).toBe(35)
    expect(ageInYears('1990-05-15', '2026-05-15')).toBe(36)
    expect(ageInYears('1990-05-15', '2026-12-01')).toBe(36)
  })

  it('handles a 29 February birthday', () => {
    expect(ageInYears('2004-02-29', '2026-02-28')).toBe(21)
    expect(ageInYears('2004-02-29', '2026-03-01')).toBe(22)
  })

  it('rejects malformed dates', () => {
    expect(() => ageInYears('15/05/1990', '2026-05-15')).toThrow(RangeError)
  })
})
