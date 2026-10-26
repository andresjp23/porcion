import {
  parseMealPrepReturn,
  resumeHref,
  saveDraft,
  scanIngredientHref,
  clearDraft,
  readDraft,
} from './ingredientReturn'
import type { MealPrepInput } from './mealPrepSchema'

const EDIT = '/meal-prep/11111111-1111-4111-8111-111111111111/edit'

describe('parseMealPrepReturn', () => {
  it('accepts only the meal prep forms', () => {
    expect(parseMealPrepReturn('/meal-prep/new')).toBe('/meal-prep/new')
    expect(parseMealPrepReturn(EDIT)).toBe(EDIT)
  })

  it('ignores anything else, such as another site', () => {
    expect(parseMealPrepReturn(null)).toBeNull()
    expect(parseMealPrepReturn('https://example.com/meal-prep/new')).toBeNull()
    expect(parseMealPrepReturn('//example.com')).toBeNull()
    expect(parseMealPrepReturn('/profile')).toBeNull()
    expect(parseMealPrepReturn('/meal-prep/new?x=1')).toBeNull()
  })
})

describe('links', () => {
  it('opens the scanner with the way back', () => {
    expect(scanIngredientHref('/meal-prep/new')).toBe('/scan?return=%2Fmeal-prep%2Fnew')
  })

  it('goes back with the draft and the food', () => {
    expect(resumeHref('/meal-prep/new', 'food-1')).toBe('/meal-prep/new?resume=1&ingredient=food-1')
    expect(resumeHref('/meal-prep/new')).toBe('/meal-prep/new?resume=1')
  })
})

describe('drafts', () => {
  const draft: MealPrepInput = {
    name: 'Pollo',
    ingredients: [],
    cookedGrams: '1275',
    servings: '',
  }

  it('stays until it is cleared', () => {
    saveDraft('/meal-prep/new', draft)
    expect(readDraft('/meal-prep/new')).toEqual(draft)
    expect(readDraft('/meal-prep/new')).toEqual(draft)
    clearDraft('/meal-prep/new')
    expect(readDraft('/meal-prep/new')).toBeNull()
  })

  it('keeps each form apart', () => {
    saveDraft(EDIT, draft)
    expect(readDraft('/meal-prep/new')).toBeNull()
    expect(readDraft(EDIT)).toEqual(draft)
  })

  it('survives storage that throws', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(readDraft('/meal-prep/new')).toBeNull()
    spy.mockRestore()
  })
})
