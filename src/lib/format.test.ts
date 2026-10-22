import { formatFactor, formatGrams, formatKcal } from './format'

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

describe('formatFactor', () => {
  it('keeps the decimals of a multiplier with a decimal comma', () => {
    expect(formatFactor(1.55)).toBe('1,55')
    expect(formatFactor(1.375)).toBe('1,375')
    expect(formatFactor(1.2)).toBe('1,2')
  })
})
