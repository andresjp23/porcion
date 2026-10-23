import { listProgress } from './shopping'

describe('listProgress', () => {
  it('counts the checked items', () => {
    expect(
      listProgress([
        { checkedAt: '2026-10-23T12:00:00Z' },
        { checkedAt: null },
        { checkedAt: '2026-10-23T12:05:00Z' },
      ]),
    ).toEqual({ checked: 2, total: 3 })
  })

  it('handles an empty list', () => {
    expect(listProgress([])).toEqual({ checked: 0, total: 0 })
  })
})
