// Open Food Facts client (R-10, design §4): one product by barcode, read-only.
// The response is parsed with Zod and only the fields the app uses are asked
// for. Nothing is retried: a 429 or 503 is reported as `unavailable` and the
// screen offers to create the food by hand.

import { z } from 'zod'
import type { Nutrients } from '@/domain/nutrition'

const OFF_PRODUCT_URL = 'https://world.openfoodfacts.org/api/v3/product'

const FIELDS = [
  'product_name',
  'product_name_es',
  'brands',
  'nutriments',
  'product_quantity_unit',
  'serving_quantity',
].join(',')

/**
 * OFF asks every app to identify itself. Browsers do not let scripts set
 * User-Agent, so it goes in X-User-Agent, which OFF accepts in CORS.
 */
export const OFF_USER_AGENT = 'Porcion/0.1 (+https://github.com/andresjp23/porcion)'

const KJ_PER_KCAL = 4.184
const MAX_NAME_LENGTH = 120
const MAX_BRAND_LENGTH = 80
const MAX_SERVING_GRAMS = 2000

/** A value OFF may send as a number or a numeric string; anything else is missing. */
const amount = z
  .union([
    z.number(),
    z
      .string()
      .regex(/^\s*\d+(\.\d+)?\s*$/)
      .transform(Number),
  ])
  .pipe(z.number().finite().nonnegative())
  .optional()
  .catch(undefined)
const text = z.string().optional().catch(undefined)

const responseSchema = z.object({
  product: z.object({
    product_name: text,
    product_name_es: text,
    brands: text,
    product_quantity_unit: text,
    serving_quantity: amount,
    nutriments: z
      .object({
        'energy-kcal_100g': amount,
        'energy-kj_100g': amount,
        proteins_100g: amount,
        carbohydrates_100g: amount,
        fat_100g: amount,
      })
      .catch({}),
  }),
})

export type OffProduct = {
  name: string | null
  brand: string | null
  basis: 'g' | 'ml'
  /** Per 100 g or 100 ml; a nutrient is missing when OFF does not have it. */
  per100: Partial<Nutrients>
  /** Grams (or ml) of the label serving, when it looks sensible. */
  servingGrams: number | null
}

export type OffLookup =
  | { status: 'found'; product: OffProduct }
  | { status: 'not_found' }
  /** Rate limit, OFF down, offline, or a response we could not read. */
  | { status: 'unavailable' }

function clean(value: string | undefined, maxLength: number) {
  const trimmed = value?.trim()
  return trimmed ? trimmed.slice(0, maxLength).trim() : null
}

/** Maps the parts of an OFF product the app uses. Exported for tests. */
export function toOffProduct(product: z.infer<typeof responseSchema>['product']): OffProduct {
  const n = product.nutriments
  const kcal =
    n['energy-kcal_100g'] ??
    (n['energy-kj_100g'] === undefined ? undefined : n['energy-kj_100g'] / KJ_PER_KCAL)
  const unit = product.product_quantity_unit?.trim().toLowerCase()
  const serving = product.serving_quantity
  return {
    name: clean(product.product_name_es || product.product_name, MAX_NAME_LENGTH),
    // "Soprole, Nestlé": the first one is the brand on the package.
    brand: clean(product.brands?.split(',')[0], MAX_BRAND_LENGTH),
    basis: unit === 'ml' || unit === 'cl' || unit === 'l' ? 'ml' : 'g',
    per100: {
      kcal,
      protein: n.proteins_100g,
      carbs: n.carbohydrates_100g,
      fat: n.fat_100g,
    },
    servingGrams: serving && serving > 0 && serving <= MAX_SERVING_GRAMS ? serving : null,
  }
}

/** The four values when OFF has all of them (design §4: "producto completo"). */
export function completeNutrients(per100: Partial<Nutrients>): Nutrients | null {
  const { kcal, protein, carbs, fat } = per100
  return kcal === undefined || protein === undefined || carbs === undefined || fat === undefined
    ? null
    : { kcal, protein, carbs, fat }
}

/** Looks up a canonical barcode (src/domain/barcode.ts) in Open Food Facts. */
export async function fetchOffProduct(barcode: string, signal?: AbortSignal): Promise<OffLookup> {
  let response: Response
  try {
    response = await fetch(`${OFF_PRODUCT_URL}/${barcode}?fields=${FIELDS}`, {
      headers: { 'X-User-Agent': OFF_USER_AGENT },
      signal,
    })
  } catch (error) {
    if (signal?.aborted) throw error
    return { status: 'unavailable' }
  }
  if (response.status === 404) return { status: 'not_found' }
  if (!response.ok) return { status: 'unavailable' }

  const parsed = responseSchema.safeParse(await response.json().catch(() => null))
  if (!parsed.success) return { status: 'unavailable' }
  return { status: 'found', product: toOffProduct(parsed.data.product) }
}
