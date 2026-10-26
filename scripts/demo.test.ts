import { addDays } from '../src/domain/dates'
import { sumNutrients } from '../src/domain/nutrition'
import { buildFromData } from './build-seed'
import { buildDemoPlan } from './demo'

const today = '2026-10-25'
const seed = buildFromData()
const plan = buildDemoPlan(today, seed)

describe('buildDemoPlan', () => {
  it('gives the same data on the same day', () => {
    expect(buildDemoPlan(today, seed)).toEqual(plan)
  })

  it('weighs on most of the last 60 days, today included, inside the valid range', () => {
    expect(plan.weights.length).toBeGreaterThan(35)
    expect(plan.weights.at(0)!.date >= addDays(today, -59)).toBe(true)
    expect(plan.weights.at(-1)!.date).toBe(today)
    for (const { weight_kg } of plan.weights) {
      expect(weight_kg).toBeGreaterThanOrEqual(30)
      expect(weight_kg).toBeLessThanOrEqual(300)
    }
    // The trend goes down, as the goal says.
    expect(plan.weights.at(-1)!.weight_kg).toBeLessThan(plan.weights[0]!.weight_kg)
  })

  it('logs three weeks of meals, with only breakfast and lunch today', () => {
    const days = new Set(plan.logs.map((log) => log.log_date))
    expect(days.size).toBe(21)
    const todayMeals = new Set(plan.logs.filter((l) => l.log_date === today).map((l) => l.meal))
    expect([...todayMeals].sort()).toEqual(['breakfast', 'lunch'])
  })

  it('keeps the days near the target, with some over it (R-08 is about tone, not data)', () => {
    const days = [...new Set(plan.logs.map((log) => log.log_date))].filter((d) => d !== today)
    const totals = days.map(
      (date) => sumNutrients(plan.logs.filter((log) => log.log_date === date)).kcal,
    )
    const target = plan.profile.kcal_target
    expect(totals.every((kcal) => kcal > target * 0.6 && kcal < target * 1.6)).toBe(true)
    expect(totals.some((kcal) => kcal > target)).toBe(true)
  })

  it('uses unique log ids and snapshots computed from the seed', () => {
    expect(new Set(plan.logs.map((log) => log.id)).size).toBe(plan.logs.length)
    const bread = plan.logs.find((log) => log.food_name === 'Marraqueta')!
    // 272 kcal per 100 g, half a marraqueta (50 g).
    expect(bread.grams).toBe(50)
    expect(bread.kcal).toBeCloseTo(136)
  })

  it('sets the target from the profile and the latest weight', () => {
    expect(plan.profile.kcal_target).toBeGreaterThanOrEqual(1200)
    expect(plan.profile.protein_g).toBe(Math.round(plan.weights.at(-1)!.weight_kg * 1.6))
  })
})
