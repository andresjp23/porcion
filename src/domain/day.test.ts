import { dayBalance } from './day'

describe('dayBalance', () => {
  it('shows what is left while under the target', () => {
    expect(dayBalance(1187, 2100)).toEqual({ status: 'under', remaining: 913 })
    expect(dayBalance(2100, 2100)).toEqual({ status: 'under', remaining: 0 })
  })

  it('shows how much over the target, as a positive number (HU-03 CA4)', () => {
    expect(dayBalance(2220, 2100)).toEqual({ status: 'over', over: 120 })
  })
})
