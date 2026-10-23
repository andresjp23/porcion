import { addDays, isIsoDate, localDate } from './dates'

describe('localDate', () => {
  it('returns the date in the given time zone as YYYY-MM-DD', () => {
    // 02:30 UTC on the 23rd is still the 22nd in Santiago (UTC−3)
    const instant = new Date('2026-10-23T02:30:00Z')
    expect(localDate(instant, 'America/Santiago')).toBe('2026-10-22')
    expect(localDate(instant, 'UTC')).toBe('2026-10-23')
  })

  it('pads month and day', () => {
    expect(localDate(new Date('2026-01-05T15:00:00Z'), 'UTC')).toBe('2026-01-05')
  })
})

describe('addDays', () => {
  it('moves across months, years and leap days', () => {
    expect(addDays('2026-10-22', -1)).toBe('2026-10-21')
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31')
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
  })

  it('ignores daylight saving changes', () => {
    // Chile moves its clocks in September and April.
    expect(addDays('2026-09-05', 1)).toBe('2026-09-06')
    expect(addDays('2026-04-04', 1)).toBe('2026-04-05')
  })
})

describe('isIsoDate', () => {
  it('accepts real dates only', () => {
    expect(isIsoDate('2026-10-22')).toBe(true)
    expect(isIsoDate('2026-02-30')).toBe(false)
    expect(isIsoDate('22-10-2026')).toBe(false)
    expect(isIsoDate('hoy')).toBe(false)
  })
})
