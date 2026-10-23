import { defaultServing } from './serving'

const egg = { kcal: 148, protein: 12.4, carbs: 1, fat: 10 }

describe('defaultServing', () => {
  it('shows the default portion with its weight and kcal', () => {
    const serving = defaultServing({
      basis: 'g',
      per100: egg,
      defaultPortion: { id: 'p1', name: '1 huevo', grams: 50.3 },
    })
    expect(serving.label).toBe('1 huevo · 50,3 g')
    expect(serving.grams).toBe(50.3)
    expect(serving.kcal).toBeCloseTo(74.444)
  })

  it('falls back to 100 g without a default portion', () => {
    expect(defaultServing({ basis: 'g', per100: egg, defaultPortion: null })).toEqual({
      label: '100 g',
      grams: 100,
      kcal: 148,
    })
  })

  it('uses ml for liquids', () => {
    const milk = { kcal: 60, protein: 3.3, carbs: 4.7, fat: 3.2 }
    expect(defaultServing({ basis: 'ml', per100: milk, defaultPortion: null }).label).toBe('100 ml')
  })

  it('does not repeat an amount the portion name already states', () => {
    const serving = defaultServing({
      basis: 'ml',
      per100: { kcal: 42, protein: 0, carbs: 10.4, fat: 0.2 },
      defaultPortion: { id: 'p2', name: '1 vaso (200 ml)', grams: 200 },
    })
    expect(serving.label).toBe('1 vaso (200 ml)')
  })
})
