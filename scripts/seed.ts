// Builds supabase/seed.sql from data/seed_foods.csv, data/seed_portions.csv and
// data/recipes/*.json (design §6). Every row is validated with the same rules
// the app uses (src/domain/validation.ts), so a bad value fails the build.
import { createHash } from 'node:crypto'
import { z } from 'zod'
import { nutrientsPer100ForRecipe, type Nutrients } from '../src/domain/nutrition'
import { checkAtwater, nutrientIssues } from '../src/domain/validation'

export const FOOD_COLUMNS = [
  'key',
  'name',
  'aliases',
  'basis',
  'kcal_100',
  'protein_100',
  'carbs_100',
  'fat_100',
  'fuente',
  'licencia',
  'descripcion_fuente',
  'nota_4_4_9',
] as const

export const PORTION_COLUMNS = ['food_key', 'name', 'grams', 'is_default', 'fuente'] as const

export type SeedFood = {
  key: string
  name: string
  aliases: string[]
  basis: 'g' | 'ml'
  per100: Nutrients
  fuente: string
  licencia: 'cc0' | 'nc'
}

export type SeedPortion = {
  foodKey: string
  name: string
  grams: number
  isDefault: boolean
  fuente: string
}

export type SeedResult = {
  foods: SeedFood[]
  portions: SeedPortion[]
  errors: string[]
  /** Not blocking: values that still need a check by hand. */
  warnings: string[]
}

/** Minimal RFC 4180 parser: commas, double-quoted fields and "" escapes. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"'
        i++
      } else if (char === '"') quoted = false
      else field += char
    } else if (char === '"') quoted = true
    else if (char === ',') {
      row.push(field)
      field = ''
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else field += char
  }
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

function toRecords<T extends string>(text: string, columns: readonly T[], file: string) {
  const [header, ...rows] = parseCsv(text)
  if (header?.join(',') !== columns.join(',')) {
    throw new Error(`${file}: expected columns ${columns.join(',')}, got ${header?.join(',')}`)
  }
  return rows
    .filter((row) => row.some((cell) => cell.trim() !== ''))
    .map((row, i) => ({
      line: i + 2,
      record: Object.fromEntries(columns.map((c, j) => [c, (row[j] ?? '').trim()])) as Record<
        T,
        string
      >,
    }))
}

const per100Schema = z.object({
  kcal: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fat: z.number(),
})

export const recipeSchema = z.object({
  key: z.string().regex(/^[a-z0-9-]+$/),
  description: z.string().min(1),
  notes: z.string(),
  ingredients: z
    .array(
      z.object({
        name: z.string().min(1),
        grams: z.number().positive(),
        fuente: z.string().regex(/^(fdc:\d+|sin aporte)$/),
        per100: per100Schema,
      }),
    )
    .min(1),
  cookedGrams: z.number().positive(),
})

export type Recipe = z.infer<typeof recipeSchema>

const KEY = /^[a-z0-9]+(-[a-z0-9]+)*$/
const FOOD_SOURCE = /^(fdc:\d+|minsal2010:[A-Z]+\d+|receta:[a-z0-9-]+)$/
const PORTION_SOURCE = /^(fdc:\d+|medida|estimado)$/

function parseNumber(value: string) {
  return value === '' ? Number.NaN : Number(value)
}

export function buildSeed(
  foodsCsv: string,
  portionsCsv: string,
  recipes: Map<string, Recipe>,
): SeedResult {
  const errors: string[] = []
  const warnings: string[] = []
  const foods: SeedFood[] = []
  const names = new Set<string>()

  for (const { line, record: r } of toRecords(foodsCsv, FOOD_COLUMNS, 'seed_foods.csv')) {
    const at = `seed_foods.csv:${line} (${r.key || '?'})`
    if (!KEY.test(r.key)) errors.push(`${at}: invalid key`)
    if (foods.some((f) => f.key === r.key)) errors.push(`${at}: duplicate key`)
    if (r.name === '' || r.name.length > 120) errors.push(`${at}: name must have 1–120 characters`)
    if (names.has(r.name.toLowerCase())) errors.push(`${at}: duplicate name`)
    names.add(r.name.toLowerCase())
    if (r.basis !== 'g' && r.basis !== 'ml') errors.push(`${at}: basis must be g or ml`)
    if (!FOOD_SOURCE.test(r.fuente)) errors.push(`${at}: invalid fuente "${r.fuente}"`)
    if (r.licencia !== 'cc0' && r.licencia !== 'nc')
      errors.push(`${at}: licencia must be cc0 or nc`)
    if (r.fuente.startsWith('minsal2010:') && r.licencia !== 'nc') {
      errors.push(`${at}: FAO/MINSAL 2010 rows are non-commercial (licencia nc)`)
    }

    let per100: Nutrients
    if (r.fuente.startsWith('receta:')) {
      const recipe = recipes.get(r.fuente.slice('receta:'.length))
      if (!recipe) {
        errors.push(`${at}: recipe ${r.fuente} not found in data/recipes`)
        continue
      }
      if ([r.kcal_100, r.protein_100, r.carbs_100, r.fat_100].some((v) => v !== '')) {
        errors.push(`${at}: recipe rows leave the nutrients empty, the script computes them`)
      }
      per100 = nutrientsPer100ForRecipe(recipe.ingredients, recipe.cookedGrams)
    } else {
      per100 = {
        kcal: parseNumber(r.kcal_100),
        protein: parseNumber(r.protein_100),
        carbs: parseNumber(r.carbs_100),
        fat: parseNumber(r.fat_100),
      }
    }

    const issues = nutrientIssues(per100)
    if (issues.length > 0) {
      errors.push(`${at}: ${issues.map((i) => `${i.field} ${i.code}`).join(', ')}`)
      continue
    }
    // R-07: a gap is only accepted when the CSV says why.
    const atwater = checkAtwater(per100)
    if (!atwater.isConsistent && r.nota_4_4_9 === '') {
      errors.push(
        `${at}: kcal ${per100.kcal} vs 4/4/9 ${atwater.estimatedKcal.toFixed(0)}; explain it in nota_4_4_9`,
      )
    }
    if (atwater.isConsistent && r.nota_4_4_9 !== '') {
      errors.push(`${at}: nota_4_4_9 is set but the values pass 4/4/9`)
    }

    foods.push({
      key: r.key,
      name: r.name,
      aliases: r.aliases === '' ? [] : r.aliases.split('|').map((a) => a.trim()),
      basis: r.basis === 'ml' ? 'ml' : 'g',
      per100,
      fuente: r.fuente,
      licencia: r.licencia === 'nc' ? 'nc' : 'cc0',
    })
  }

  const portions: SeedPortion[] = []
  for (const { line, record: r } of toRecords(portionsCsv, PORTION_COLUMNS, 'seed_portions.csv')) {
    const at = `seed_portions.csv:${line} (${r.food_key} / ${r.name})`
    const grams = parseNumber(r.grams)
    if (!foods.some((f) => f.key === r.food_key)) errors.push(`${at}: unknown food_key`)
    if (r.name === '' || r.name.length > 40) errors.push(`${at}: name must have 1–40 characters`)
    if (portions.some((p) => p.foodKey === r.food_key && p.name === r.name)) {
      errors.push(`${at}: duplicate portion`)
    }
    if (!(grams > 0)) errors.push(`${at}: grams must be > 0`)
    if (r.is_default !== 'true' && r.is_default !== 'false') {
      errors.push(`${at}: is_default must be true or false`)
    }
    if (!PORTION_SOURCE.test(r.fuente)) errors.push(`${at}: invalid fuente "${r.fuente}"`)
    if (r.fuente === 'estimado') warnings.push(`${at}: estimated weight, check it on a scale`)
    portions.push({
      foodKey: r.food_key,
      name: r.name,
      grams,
      isDefault: r.is_default === 'true',
      fuente: r.fuente,
    })
  }

  for (const food of foods) {
    const own = portions.filter((p) => p.foodKey === food.key)
    const defaults = own.filter((p) => p.isDefault).length
    if (own.length > 0 && defaults !== 1) {
      errors.push(`${food.key}: needs exactly one default portion, has ${defaults}`)
    }
  }

  return { foods, portions, errors, warnings }
}

// Stable ids (UUID v5) so rebuilding the seed keeps the same rows.
const SEED_NAMESPACE = '3f1b6c2e-8a4d-5e7f-9b0c-1d2e3f4a5b6c'

export function stableUuid(name: string) {
  const namespace = Buffer.from(SEED_NAMESPACE.replaceAll('-', ''), 'hex')
  const hash = createHash('sha1').update(namespace).update(name).digest()
  hash[6] = (hash[6]! & 0x0f) | 0x50
  hash[8] = (hash[8]! & 0x3f) | 0x80
  const hex = hash.subarray(0, 16).toString('hex')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

const sqlText = (value: string) => `'${value.replaceAll("'", "''")}'`
// numeric(6,2) and numeric(7,2): store two decimals, so the file is stable.
const sqlNumber = (value: number) => String(Math.round(value * 100) / 100)
const sqlArray = (values: string[]) =>
  values.length === 0 ? `'{}'` : `array[${values.map(sqlText).join(', ')}]`

export function renderSeedSql({ foods, portions }: Pick<SeedResult, 'foods' | 'portions'>) {
  const foodId = (key: string) => stableUuid(`food:${key}`)
  const foodRows = foods.map((f) => {
    const values = [
      sqlText(foodId(f.key)),
      sqlText(f.name),
      sqlArray(f.aliases),
      sqlText(f.basis),
      sqlNumber(f.per100.kcal),
      sqlNumber(f.per100.protein),
      sqlNumber(f.per100.carbs),
      sqlNumber(f.per100.fat),
    ]
    return `  (${values.join(', ')}, 'seed', true, null)`
  })
  const portionRows = portions.map((p) => {
    const values = [
      sqlText(stableUuid(`portion:${p.foodKey}:${p.name}`)),
      sqlText(foodId(p.foodKey)),
      sqlText(p.name),
      sqlNumber(p.grams),
      String(p.isDefault),
    ]
    return `  (${values.join(', ')})`
  })
  const sources = foods.map((f) => `--   ${f.key}: ${f.fuente} (${f.licencia})`)

  return [
    '-- Base foods seed. Generated by scripts/build-seed.ts from data/ (design §6).',
    '-- Do not edit by hand: change the CSV or the recipe and run `npm run seed:build`.',
    '--',
    '-- Sources: USDA FoodData Central (CC0), "FAO y Ministerio de Salud de Chile 2010"',
    '-- (non-commercial use only, licencia nc) and recipes in data/recipes.',
    ...sources,
    '',
    'insert into public.foods',
    '  (id, name, aliases, basis, kcal_100, protein_100, carbs_100, fat_100, source, verified, created_by)',
    'values',
    foodRows.join(',\n') + ';',
    '',
    'insert into public.food_portions (id, food_id, name, grams, is_default)',
    'values',
    portionRows.join(',\n') + ';',
    '',
  ].join('\n')
}
