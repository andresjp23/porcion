import {
  isCodeLabel,
  labelFits,
  listProgress,
  matchScan,
  pendingCodes,
  summarizeSession,
  type MatchableItem,
} from './shopping'

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

describe('labelFits', () => {
  it('matches every word of the label to the start of a word of the name', () => {
    expect(labelFits('leche', 'Leche Entera Soprole')).toBe(true)
    expect(labelFits('Pan molde', 'Pan de Molde Ideal')).toBe(true)
    expect(labelFits('atun', 'Atún en agua San José')).toBe(true)
    expect(labelFits('yogur', 'Yoghurt natural')).toBe(false)
  })

  it('does not match inside a word or with a missing word', () => {
    expect(labelFits('pan', 'Empanada de pino')).toBe(false)
    expect(labelFits('leche descremada', 'Leche Entera')).toBe(false)
  })

  it('ignores words that say nothing about the product', () => {
    expect(labelFits('de la', 'Leche')).toBe(false)
    expect(labelFits('leche de vaca', 'Leche Vaca Feliz')).toBe(true)
  })
})

describe('matchScan', () => {
  const item = (id: string, label: string, extra: Partial<MatchableItem> = {}): MatchableItem => ({
    id,
    label,
    foodId: null,
    barcode: null,
    checkedAt: null,
    ...extra,
  })
  const milk = { barcode: '96385074', foodId: 'food-milk', name: 'Leche Entera Soprole' }

  it('counts a code already in the list as a repeat (HU-12 CA6)', () => {
    expect(matchScan([item('a', 'leche', { barcode: '96385074' })], milk)).toEqual({
      kind: 'repeat',
      itemId: 'a',
    })
  })

  it('prefers the item linked to the scanned food (HU-12 CA2)', () => {
    const items = [item('a', 'leche'), item('b', 'Leche Entera', { foodId: 'food-milk' })]
    expect(matchScan(items, milk)).toEqual({ kind: 'match', itemId: 'b' })
  })

  it('matches a free-text item by name', () => {
    expect(matchScan([item('a', 'leche'), item('b', 'pan')], milk)).toEqual({
      kind: 'match',
      itemId: 'a',
    })
  })

  it('asks when several items fit', () => {
    expect(matchScan([item('a', 'leche'), item('b', 'leche entera')], milk)).toEqual({
      kind: 'ambiguous',
      itemIds: ['a', 'b'],
    })
  })

  it('skips items already scanned or checked by hand', () => {
    const items = [
      item('a', 'leche', { barcode: '7801234567894' }),
      item('b', 'leche', { checkedAt: '2026-10-23T12:00:00Z' }),
    ]
    expect(matchScan(items, milk)).toEqual({ kind: 'none' })
  })

  it('finds nothing for an unknown product', () => {
    expect(
      matchScan([item('a', 'leche')], { barcode: '7801234567894', foodId: null, name: null }),
    ).toEqual({ kind: 'none' })
  })
})

describe('summarizeSession', () => {
  it('counts scans, completed and pending products (HU-12 CA5)', () => {
    expect(summarizeSession(5, [{ foodId: 'a' }, { foodId: null }, { foodId: 'b' }])).toEqual({
      scanned: 5,
      completed: 2,
      pending: 1,
    })
  })
})

describe('pendingCodes', () => {
  const row = (barcode: string | null, foodId: string | null, createdAt: string, label = 'x') => ({
    barcode,
    foodId,
    createdAt,
    label,
  })

  it('lists codes without a food, newest first and once each', () => {
    expect(
      pendingCodes([
        row('111', null, '2026-10-20T10:00:00Z', 'Galletas viejo'),
        row('222', 'food', '2026-10-21T10:00:00Z'),
        row(null, null, '2026-10-22T10:00:00Z', 'leche'),
        row('111', null, '2026-10-23T10:00:00Z', 'Galletas'),
        row('333', null, '2026-10-22T10:00:00Z', 'Código 333'),
      ]),
    ).toEqual([
      { barcode: '111', label: 'Galletas' },
      { barcode: '333', label: 'Código 333' },
    ])
  })
})

describe('isCodeLabel', () => {
  it('tells a code placeholder from a product name', () => {
    expect(isCodeLabel('Código 780 1234 567894')).toBe(true)
    expect(isCodeLabel('Galletas de avena')).toBe(false)
  })
})
