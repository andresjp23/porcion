import { suggestedMacros } from '@/domain/macros'
import { classifyTarget, targetInputFrom } from './target'

const profile = {
  sex: 'male' as const,
  birth_date: '1996-05-15',
  height_cm: 178,
  activity: 'moderate' as const,
  goal: 'lose' as const,
}

describe('targetInputFrom', () => {
  it('builds the calculation input with the age on the given day', () => {
    expect(targetInputFrom(profile, 80, '2026-10-22')).toEqual({
      sex: 'male',
      weightKg: 80,
      heightCm: 178,
      ageYears: 30,
      activity: 'moderate',
      goal: 'lose',
    })
  })

  it('returns null when an answer or the weight is missing', () => {
    expect(targetInputFrom({ ...profile, goal: null }, 80, '2026-10-22')).toBeNull()
    expect(targetInputFrom(profile, null, '2026-10-22')).toBeNull()
  })
})

describe('classifyTarget', () => {
  const suggested = { kcal: 2240, ...suggestedMacros(2240, 80) }

  it('marks nothing as manual when the suggestion is kept', () => {
    const result = classifyTarget(suggested, 2240, 80)
    expect(result.kcalIsManual).toBe(false)
    expect(result.macrosAreManual).toBe(false)
  })

  it('keeps macros suggested when only the kcal changed (R-13)', () => {
    const result = classifyTarget({ kcal: 2000, ...suggestedMacros(2000, 80) }, 2240, 80)
    expect(result.kcalIsManual).toBe(true)
    expect(result.macrosAreManual).toBe(false)
  })

  it('marks macros as manual when they differ from the suggestion', () => {
    const result = classifyTarget({ ...suggested, protein: 160 }, 2240, 80)
    expect(result.kcalIsManual).toBe(false)
    expect(result.macrosAreManual).toBe(true)
  })
})
