import { adjustTargetSchema, bodySchema, goalSchema, sexAndBirthSchema } from './schemas'

describe('sexAndBirthSchema', () => {
  const schema = sexAndBirthSchema('2026-10-22')

  it('accepts an adult', () => {
    expect(schema.safeParse({ sex: 'female', birthDate: '2008-10-22' }).success).toBe(true)
  })

  it('rejects someone under 18 (R-12)', () => {
    const result = schema.safeParse({ sex: 'female', birthDate: '2008-10-23' })
    expect(result.error?.issues[0]?.message).toBe('La app es solo para mayores de 18 años')
  })

  it('asks to choose the sex for the calculation', () => {
    const result = schema.safeParse({ birthDate: '1990-01-01' })
    expect(result.error?.issues[0]?.message).toBe('Elige una opción')
  })
})

describe('bodySchema', () => {
  it('accepts a decimal comma and returns numbers', () => {
    expect(bodySchema.parse({ heightCm: '170', weightKg: '80,5' })).toEqual({
      heightCm: 170,
      weightKg: 80.5,
    })
  })

  it.each([
    [{ heightCm: '99', weightKg: '70' }, 'Ingresa una estatura entre 100 y 250 cm'],
    [{ heightCm: '170', weightKg: '301' }, 'Ingresa un peso entre 30 y 300 kg'],
    [{ heightCm: '', weightKg: '70' }, 'Ingresa una estatura entre 100 y 250 cm'],
    [{ heightCm: '170', weightKg: 'ochenta' }, 'Ingresa un peso entre 30 y 300 kg'],
  ])('rejects %o', (values, message) => {
    expect(bodySchema.safeParse(values).error?.issues[0]?.message).toBe(message)
  })
})

describe('goalSchema', () => {
  it('requires a choice', () => {
    expect(goalSchema.safeParse({}).success).toBe(false)
    expect(goalSchema.safeParse({ goal: 'gain' }).success).toBe(true)
  })
})

describe('adjustTargetSchema', () => {
  const schema = adjustTargetSchema('female')
  const valid = { kcal: '1800', protein: '110', carbs: '200', fat: '60', confirmBelowFloor: false }

  it('returns whole numbers', () => {
    expect(schema.parse(valid)).toEqual({
      kcal: 1800,
      protein: 110,
      carbs: 200,
      fat: 60,
      confirmBelowFloor: false,
    })
  })

  it('rejects decimals and out-of-range macros (R-13)', () => {
    expect(schema.safeParse({ ...valid, protein: '110,5' }).success).toBe(false)
    expect(schema.safeParse({ ...valid, fat: '1001' }).success).toBe(false)
  })

  it('needs a confirmation below the floor (R-05)', () => {
    const low = { ...valid, kcal: '1100' }
    expect(schema.safeParse(low).error?.issues[0]?.message).toBe(
      'Confirma que quieres usar una meta bajo el mínimo recomendado',
    )
    expect(schema.safeParse({ ...low, confirmBelowFloor: true }).success).toBe(true)
  })
})
