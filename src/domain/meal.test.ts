import { mealAt, mealForTime, timeOfDayIn } from './meal'

describe('mealForTime', () => {
  it.each([
    [0, 0, 'breakfast'],
    [10, 59, 'breakfast'],
    [11, 0, 'lunch'],
    [15, 59, 'lunch'],
    [16, 0, 'snack'],
    [19, 29, 'snack'],
    [19, 30, 'dinner'],
    [23, 59, 'dinner'],
  ] as const)('%s:%s → %s (R-09)', (hour, minute, meal) => {
    expect(mealForTime({ hour, minute })).toBe(meal)
  })
})

describe('timeOfDayIn', () => {
  it('reads the local time in the given time zone', () => {
    // 15:30 UTC is 12:30 in Santiago during summer time (UTC−3)
    const instant = new Date('2026-01-15T15:30:00Z')
    expect(timeOfDayIn(instant, 'America/Santiago')).toEqual({ hour: 12, minute: 30 })
    expect(timeOfDayIn(instant, 'UTC')).toEqual({ hour: 15, minute: 30 })
  })

  it('reports midnight as hour 0', () => {
    expect(timeOfDayIn(new Date('2026-01-15T00:05:00Z'), 'UTC')).toEqual({ hour: 0, minute: 5 })
  })
})

describe('mealAt', () => {
  it('uses the user time zone, not UTC', () => {
    // 22:00 UTC is 19:00 in Santiago: snack there, dinner in UTC
    const instant = new Date('2026-01-15T22:00:00Z')
    expect(mealAt(instant, 'America/Santiago')).toBe('snack')
    expect(mealAt(instant, 'UTC')).toBe('dinner')
  })
})
