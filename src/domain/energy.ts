// R-03 to R-05: basal metabolic rate, daily expenditure, goal adjustment and
// floors. The union types mirror the Postgres enums of the same name.

export type Sex = 'male' | 'female'
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'high' | 'very_high'
export type Goal = 'lose' | 'maintain' | 'gain'

/** R-04 activity factors. */
export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  high: 1.725,
  very_high: 1.9,
}

/** R-04 adjustment by goal, in kcal. */
export const GOAL_ADJUSTMENTS: Record<Goal, number> = {
  lose: -500,
  maintain: 0,
  gain: 250,
}

/** R-05 minimum suggested target, in kcal. */
export const KCAL_FLOORS: Record<Sex, number> = {
  male: 1500,
  female: 1200,
}

export type BodyData = {
  sex: Sex
  weightKg: number
  heightCm: number
  ageYears: number
}

export type TargetInput = BodyData & {
  activity: ActivityLevel
  goal: Goal
}

/** The suggested target and how it was reached, for the "Tu meta" breakdown. */
export type TargetBreakdown = {
  bmr: number
  activityFactor: number
  tdee: number
  goalAdjustment: number
  /** Suggested target, rounded to the nearest ten and never below the floor. */
  kcal: number
  /** True when the calculation fell below the floor and the floor was used. */
  floorApplied: boolean
}

function assertPositive(value: number, name: string) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be a finite number > 0, got ${value}`)
  }
}

/** R-03: Mifflin-St Jeor, in kcal/day. */
export function basalMetabolicRate({ sex, weightKg, heightCm, ageYears }: BodyData) {
  assertPositive(weightKg, 'weightKg')
  assertPositive(heightCm, 'heightCm')
  assertPositive(ageYears, 'ageYears')
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears
  return sex === 'male' ? base + 5 : base - 161
}

/** R-04 and R-05: the suggested daily target with its breakdown. */
export function suggestedTarget(input: TargetInput): TargetBreakdown {
  const bmr = basalMetabolicRate(input)
  const activityFactor = ACTIVITY_FACTORS[input.activity]
  const tdee = bmr * activityFactor
  const goalAdjustment = GOAL_ADJUSTMENTS[input.goal]
  const rounded = Math.round((tdee + goalAdjustment) / 10) * 10
  const floor = KCAL_FLOORS[input.sex]
  return {
    bmr,
    activityFactor,
    tdee,
    goalAdjustment,
    kcal: Math.max(rounded, floor),
    floorApplied: rounded < floor,
  }
}

/** R-05: a manual target below the floor needs the user to confirm a notice. */
export function isBelowFloor(kcal: number, sex: Sex) {
  return kcal < KCAL_FLOORS[sex]
}

/** Full years between two ISO dates (YYYY-MM-DD), without time zone shifts. */
export function ageInYears(birthDate: string, onDate: string) {
  const [by, bm, bd] = parseIsoDate(birthDate)
  const [y, m, d] = parseIsoDate(onDate)
  const hadBirthday = m > bm || (m === bm && d >= bd)
  return y - by - (hadBirthday ? 0 : 1)
}

function parseIsoDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) throw new RangeError(`Expected a YYYY-MM-DD date, got "${value}"`)
  return [Number(match[1]), Number(match[2]), Number(match[3])] as const
}
