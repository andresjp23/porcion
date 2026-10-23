import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { buildFromData, repoRoot } from './build-seed'
import {
  buildSeed,
  FOOD_COLUMNS,
  parseCsv,
  PORTION_COLUMNS,
  renderSeedSql,
  stableUuid,
  type Recipe,
} from './seed'

const foodsHeader = FOOD_COLUMNS.join(',')
const portionsHeader = PORTION_COLUMNS.join(',')

// Marraqueta (fdc:172675), per 100 g.
const bread = 'marraqueta,Marraqueta,pan batido|pan,g,272,10.75,49.68,2.42,fdc:172675,cc0,Bread,'

function build(
  foodRows: string[],
  portionRows: string[] = [],
  recipes = new Map<string, Recipe>(),
) {
  return buildSeed(
    [foodsHeader, ...foodRows].join('\n'),
    [portionsHeader, ...portionRows].join('\n'),
    recipes,
  )
}

describe('parseCsv', () => {
  it('reads quoted fields with commas, escaped quotes and CRLF line ends', () => {
    expect(parseCsv('a,"b, c","say ""hi"""\r\n1,2,3\n')).toEqual([
      ['a', 'b, c', 'say "hi"'],
      ['1', '2', '3'],
    ])
  })
})

describe('buildSeed', () => {
  it('accepts valid foods and portions', () => {
    const result = build([bread], ['marraqueta,1 marraqueta,100,true,estimado'])
    expect(result.errors).toEqual([])
    expect(result.foods[0]).toMatchObject({
      key: 'marraqueta',
      aliases: ['pan batido', 'pan'],
      per100: { kcal: 272, protein: 10.75, carbs: 49.68, fat: 2.42 },
    })
    expect(result.warnings).toHaveLength(1)
  })

  it('rejects the header when a column is missing', () => {
    expect(() => buildSeed('key,name\n', portionsHeader, new Map())).toThrow(/expected columns/)
  })

  it('rejects values outside the per-100 g limits', () => {
    const result = build(['aceite,Aceite,,ml,950,0,0,100,fdc:1,cc0,Oil,'])
    expect(result.errors.join()).toMatch(/kcal too_high/)
  })

  it('requires nota_4_4_9 when kcal and macros disagree (R-07)', () => {
    const lentils = 'lentejas,Lentejas,,g,116,9.02,12.23,0.38,fdc:172421,cc0,Lentils,'
    expect(build([lentils]).errors.join()).toMatch(/explain it in nota_4_4_9/)
    expect(build([lentils + 'Fibra']).errors).toEqual([])
  })

  it('rejects a nota_4_4_9 that is no longer needed', () => {
    expect(build([bread + 'Sobra']).errors.join()).toMatch(/pass 4\/4\/9/)
  })

  it('requires FAO/MINSAL 2010 rows to be marked non-commercial', () => {
    const turkey = 'pavo,Pavo,,g,94,20.6,0.3,1.1,minsal2010:F21,cc0,Turkey,'
    expect(build([turkey]).errors.join()).toMatch(/non-commercial/)
  })

  it('rejects duplicate keys and names', () => {
    expect(build([bread, bread]).errors.join()).toMatch(/duplicate key.*duplicate name/)
  })

  it('needs exactly one default portion per food that has portions', () => {
    const result = build(
      [bread],
      ['marraqueta,1 marraqueta,100,true,estimado', 'marraqueta,1/2 marraqueta,50,true,estimado'],
    )
    expect(result.errors.join()).toMatch(/exactly one default portion, has 2/)
  })

  it('rejects portions of unknown foods and without grams', () => {
    const result = build([bread], ['hallulla,1 hallulla,0,true,estimado'])
    expect(result.errors.join()).toMatch(/unknown food_key.*grams must be > 0/)
  })

  it('computes recipe rows from their ingredients and cooked weight', () => {
    const recipe: Recipe = {
      key: 'pan',
      description: 'Pan',
      notes: '',
      ingredients: [
        {
          name: 'Harina',
          grams: 200,
          fuente: 'fdc:1',
          per100: { kcal: 366, protein: 10.9, carbs: 77.3, fat: 1.5 },
        },
        {
          name: 'Agua',
          grams: 100,
          fuente: 'sin aporte',
          per100: { kcal: 0, protein: 0, carbs: 0, fat: 0 },
        },
      ],
      cookedGrams: 250,
    }
    const result = build(['pan,Pan,,g,,,,,receta:pan,cc0,Receta,'], [], new Map([['pan', recipe]]))
    expect(result.errors).toEqual([])
    expect(result.foods[0]?.per100.kcal).toBeCloseTo(292.8)
  })

  it('rejects recipe rows that are missing their recipe', () => {
    expect(build(['pan,Pan,,g,,,,,receta:pan,cc0,Receta,']).errors.join()).toMatch(/not found/)
  })
})

describe('stableUuid', () => {
  it('returns the same UUID v5 for the same name', () => {
    expect(stableUuid('food:palta')).toBe(stableUuid('food:palta'))
    expect(stableUuid('food:palta')).not.toBe(stableUuid('food:platano'))
    expect(stableUuid('food:palta')).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    )
  })
})

describe('renderSeedSql', () => {
  it('escapes quotes and writes empty aliases as an empty array', () => {
    const { foods } = build(["naranja,Naranja d'Agen,,g,47,0.91,9.8,0.15,fdc:746771,cc0,Oranges,"])
    const sql = renderSeedSql({ foods, portions: [] })
    expect(sql).toContain("'Naranja d''Agen', '{}', 'g', 47, 0.91, 9.8, 0.15, 'seed', true, null")
  })
})

describe('data/', () => {
  const result = buildFromData()

  it('builds without errors', () => {
    expect(result.errors).toEqual([])
  })

  it('matches the committed supabase/seed.sql (run npm run seed:build)', () => {
    const committed = readFileSync(join(repoRoot, 'supabase/seed.sql'), 'utf8')
    expect(committed).toBe(renderSeedSql(result))
  })
})
