import { localDate } from './dates'

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
