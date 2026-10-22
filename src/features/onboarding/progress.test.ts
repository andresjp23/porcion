import { firstIncompleteStep, parseStep } from './progress'

const empty = { sex: null, birth_date: null, height_cm: null, activity: null, goal: null }

describe('firstIncompleteStep', () => {
  it('starts at step 1', () => {
    expect(firstIncompleteStep(empty, false)).toBe(1)
  })

  it('moves on as answers are saved', () => {
    const step1 = { ...empty, sex: 'female' as const, birth_date: '1990-05-15' }
    expect(firstIncompleteStep(step1, false)).toBe(2)
    expect(firstIncompleteStep({ ...step1, height_cm: 165 }, false)).toBe(2)
    const step2 = { ...step1, height_cm: 165 }
    expect(firstIncompleteStep(step2, true)).toBe(3)
    const step3 = { ...step2, activity: 'light' as const }
    expect(firstIncompleteStep(step3, true)).toBe(4)
    expect(firstIncompleteStep({ ...step3, goal: 'lose' as const }, true)).toBe(5)
  })
})

describe('parseStep', () => {
  it('accepts 1 to 5', () => {
    expect(parseStep('1')).toBe(1)
    expect(parseStep('5')).toBe(5)
  })

  it.each(['0', '6', '2.5', 'abc', undefined])('rejects %s', (param) => {
    expect(parseStep(param)).toBeNull()
  })
})
