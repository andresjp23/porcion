import { mealPrepSchema, type MealPrepInput } from './mealPrepSchema'

const chicken = {
  foodId: 'food-1',
  foodName: 'Pechuga de pollo',
  per100: { kcal: 110, protein: 23, carbs: 0, fat: 1.5 },
  grams: '1700',
}

const valid: MealPrepInput = {
  name: ' Pollo a la plancha ',
  ingredients: [chicken],
  cookedGrams: '1275',
  servings: '5',
}

function issues(input: MealPrepInput) {
  const result = mealPrepSchema.safeParse(input)
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'))
}

describe('mealPrepSchema', () => {
  it('parses a batch: trimmed name, numbers, and optional fields', () => {
    expect(mealPrepSchema.parse(valid)).toEqual({
      name: 'Pollo a la plancha',
      ingredients: [{ ...chicken, grams: 1700 }],
      cookedGrams: 1275,
      servings: 5,
    })
  })

  it('reads a decimal comma and leaves empty optional fields as null', () => {
    const parsed = mealPrepSchema.parse({
      ...valid,
      ingredients: [{ ...chicken, grams: '2,5' }],
      cookedGrams: '',
      servings: ' ',
    })
    expect(parsed.ingredients[0]?.grams).toBe(2.5)
    expect(parsed.cookedGrams).toBeNull()
    expect(parsed.servings).toBeNull()
  })

  it('needs a name and at least one ingredient', () => {
    expect(issues({ ...valid, name: '  ', ingredients: [] })).toEqual(['name', 'ingredients'])
  })

  it('keeps the R-14 ranges', () => {
    expect(
      issues({
        ...valid,
        ingredients: [{ ...chicken, grams: '10001' }],
        cookedGrams: '20001',
        servings: '51',
      }),
    ).toEqual(['ingredients.0.grams', 'cookedGrams', 'servings'])
  })

  it('rejects text, missing grams and fractional servings', () => {
    expect(
      issues({
        ...valid,
        ingredients: [{ ...chicken, grams: '' }],
        cookedGrams: 'mucho',
        servings: '2,5',
      }),
    ).toEqual(['ingredients.0.grams', 'cookedGrams', 'servings'])
  })
})
