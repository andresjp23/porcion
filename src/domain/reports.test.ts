import { isUnderReview } from './reports'

describe('isUnderReview', () => {
  it('flags a food from 3 open reports on (R-11)', () => {
    expect(isUnderReview(0)).toBe(false)
    expect(isUnderReview(2)).toBe(false)
    expect(isUnderReview(3)).toBe(true)
    expect(isUnderReview(7)).toBe(true)
  })
})
