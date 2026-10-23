import type { FoodDetail } from './api'
import {
  amountGrams,
  amountLabel,
  initialAmount,
  portionLabel,
  switchAmount,
  type Amount,
} from './amount'

const bread: Pick<FoodDetail, 'basis' | 'portions'> = {
  basis: 'g',
  portions: [
    { id: 'whole', name: '1 marraqueta', grams: 100, isDefault: true },
    { id: 'half', name: '1/2 marraqueta', grams: 50, isDefault: false },
  ],
}

describe('initialAmount', () => {
  it('starts at one default portion', () => {
    expect(initialAmount(bread)).toEqual({ kind: 'portion', portionId: 'whole', quantity: 1 })
  })

  it('uses the first portion when none is the default', () => {
    const food = { ...bread, portions: bread.portions.map((p) => ({ ...p, isDefault: false })) }
    expect(initialAmount(food)).toMatchObject({ portionId: 'whole' })
  })

  it('starts at 100 g without portions', () => {
    expect(initialAmount({ basis: 'g', portions: [] })).toEqual({ kind: 'grams', grams: 100 })
  })
})

describe('amountGrams and amountLabel', () => {
  it('multiplies the portion by the quantity', () => {
    const amount: Amount = { kind: 'portion', portionId: 'whole', quantity: 1.5 }
    expect(amountGrams(bread, amount)).toBe(150)
    expect(amountLabel(bread, amount)).toBe('1,5 × 1 marraqueta · 150 g')
  })

  it('shows a single portion without the multiplier', () => {
    expect(amountLabel(bread, initialAmount(bread))).toBe('1 marraqueta · 100 g')
  })

  it('shows plain grams, or ml for liquids', () => {
    expect(amountLabel(bread, { kind: 'grams', grams: 35 })).toBe('35 g')
    expect(amountLabel({ basis: 'ml', portions: [] }, { kind: 'grams', grams: 200 })).toBe('200 ml')
  })
})

describe('switchAmount', () => {
  it('keeps the weight when switching to grams', () => {
    const amount: Amount = { kind: 'portion', portionId: 'half', quantity: 3 }
    expect(switchAmount(bread, amount, 'grams')).toEqual({ kind: 'grams', grams: 150 })
  })

  it('starts a portion at 1', () => {
    expect(switchAmount(bread, { kind: 'grams', grams: 70 }, 'half')).toEqual({
      kind: 'portion',
      portionId: 'half',
      quantity: 1,
    })
  })
})

describe('portionLabel', () => {
  it('adds the weight unless the name already states it', () => {
    expect(portionLabel({ name: '1 marraqueta', grams: 100 }, 'g')).toBe('1 marraqueta (100 g)')
    expect(portionLabel({ name: '1 vaso (200 ml)', grams: 200 }, 'ml')).toBe('1 vaso (200 ml)')
  })
})
