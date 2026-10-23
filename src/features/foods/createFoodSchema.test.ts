import { atwaterHint, createFoodSchema, type CreateFoodInput } from './createFoodSchema'

// Atún en agua, per 100 g: 4·26 + 4·0 + 9·1,2 ≈ 115 kcal.
function input(overrides: Partial<CreateFoodInput> = {}): CreateFoodInput {
  return {
    name: 'Atún en agua',
    brand: '',
    basis: 'g',
    kcal: '116',
    protein: '26',
    carbs: '0',
    fat: '1,2',
    portions: [],
    confirmAtwater: false,
    ...overrides,
  }
}

function errorsOf(values: CreateFoodInput) {
  const result = createFoodSchema.safeParse(values)
  return result.success
    ? {}
    : Object.fromEntries(result.error.issues.map((i) => [i.path.join('.'), i.message]))
}

describe('createFoodSchema', () => {
  it('accepts a label typed with decimal commas', () => {
    const result = createFoodSchema.parse(input({ portions: [{ name: ' 1 lata ', grams: '120' }] }))
    expect(result).toMatchObject({ fat: 1.2, portions: [{ name: '1 lata', grams: 120 }] })
  })

  it('requires the name and every nutrient', () => {
    expect(errorsOf(input({ name: ' ', kcal: '' }))).toEqual({
      name: 'Escribe el nombre',
      kcal: 'Escribe un número',
    })
  })

  it('rejects values over the per-100 limits, naming the basis', () => {
    expect(errorsOf(input({ kcal: '950' }))).toEqual({
      kcal: 'Por 100 g, la energía no puede pasar de 900 kcal',
    })
    expect(errorsOf(input({ basis: 'ml', protein: '60', carbs: '50' }))).toMatchObject({
      fat: 'Proteína, carbohidratos y grasas suman más de 100 g por 100 ml',
    })
  })

  it('asks to confirm values that do not pass 4/4/9 (HU-09 CA3)', () => {
    expect(errorsOf(input({ kcal: '300' }))).toEqual({
      confirmAtwater: 'Confirma que copiaste bien los valores de la etiqueta',
    })
    expect(errorsOf(input({ kcal: '300', confirmAtwater: true }))).toEqual({})
  })

  it('needs a name and grams for each portion', () => {
    expect(errorsOf(input({ portions: [{ name: '', grams: '0' }] }))).toEqual({
      'portions.0.name': 'Escribe el nombre',
      'portions.0.grams': 'Escribe los gramos',
    })
  })
})

describe('atwaterHint', () => {
  it('confirms values that add up', () => {
    expect(atwaterHint(input())).toEqual({
      consistent: true,
      message: 'Según los macros serían ≈ 115 kcal. Coincide.',
    })
  })

  it('warns without blame when they do not', () => {
    expect(atwaterHint(input({ kcal: '300' }))).toMatchObject({ consistent: false })
  })

  it('stays quiet while a value is missing', () => {
    expect(atwaterHint(input({ fat: '' }))).toBeNull()
  })
})
