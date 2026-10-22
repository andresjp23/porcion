import { formatGrams, formatKcal } from './format'

describe('formatKcal', () => {
  it('rounds to an integer and groups thousands with a dot', () => {
    expect(formatKcal(1187.4)).toBe('1.187')
    expect(formatKcal(244.5)).toBe('245')
    expect(formatKcal(0)).toBe('0')
  })
})

describe('formatGrams', () => {
  it('keeps at most one decimal with a decimal comma', () => {
    expect(formatGrams(1.25)).toBe('1,3')
    expect(formatGrams(78)).toBe('78')
    expect(formatGrams(0.04)).toBe('0')
  })
})
