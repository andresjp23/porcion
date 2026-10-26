import type { MealPrep } from '@/domain/mealPrep'
import { cookedAgoLabel, remainingLabel } from './labels'

const rice: MealPrep = {
  ingredients: [{ per100: { kcal: 360, protein: 6.6, carbs: 79, fat: 0.6 }, grams: 200 }],
  cookedGrams: 600,
  servings: null,
  finishedByHand: false,
  loggedGrams: 180,
}

describe('cookedAgoLabel', () => {
  it('says today, yesterday or how many days ago', () => {
    expect(cookedAgoLabel(0)).toBe('Cocinado hoy')
    expect(cookedAgoLabel(1)).toBe('Cocinado ayer')
    expect(cookedAgoLabel(4)).toBe('Cocinado hace 4 días')
  })
})

describe('remainingLabel', () => {
  it('shows the grams left', () => {
    expect(remainingLabel(rice)).toBe('Quedan 420 g')
  })

  it('adds the whole servings left when the batch was split', () => {
    expect(remainingLabel({ ...rice, servings: 4 })).toBe('Quedan 420 g · 2 porciones')
    expect(remainingLabel({ ...rice, servings: 4, loggedGrams: 400 })).toBe(
      'Quedan 200 g · 1 porción',
    )
  })
})
