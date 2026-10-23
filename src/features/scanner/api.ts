import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { isImportable } from '@/domain/validation'
import { supabase } from '@/lib/supabase'
import { completeNutrients, fetchOffProduct } from '@/lib/openFoodFacts'

export type BarcodeLookup =
  | { kind: 'found'; foodId: string }
  /** HU-08 CA4. `hint` is what OFF knew of an incomplete product, to prefill Crear alimento. */
  | { kind: 'missing'; hint: { name: string | null; brand: string | null } | null }
  /** OFF rate-limited us, is down or we are offline: "No pudimos consultar ahora". */
  | { kind: 'unavailable' }

// The RPC turned the values away (bad 4/4/9, ranges, name too long…).
const REJECTED_CODES = new Set(['22023', '23514', '23502'])

/**
 * R-10: the own base by barcode first, then Open Food Facts. A complete OFF
 * product is imported with `import_off_product` so the next scan is local.
 */
export async function lookupBarcode(code: string, signal: AbortSignal): Promise<BarcodeLookup> {
  const own = await supabase
    .from('foods')
    .select('id')
    .eq('barcode', code)
    .abortSignal(signal)
    .maybeSingle()
  if (own.error) throw own.error
  if (own.data) return { kind: 'found', foodId: own.data.id }

  const off = await fetchOffProduct(code, signal)
  if (off.status === 'unavailable') return { kind: 'unavailable' }
  if (off.status === 'not_found') return { kind: 'missing', hint: null }

  const { product } = off
  const hint = { name: product.name, brand: product.brand }
  const per100 = completeNutrients(product.per100)
  if (!product.name || !per100 || !isImportable(per100)) return { kind: 'missing', hint }

  const { data, error } = await supabase.rpc('import_off_product', {
    barcode: code,
    name: product.name,
    brand: product.brand ?? undefined,
    basis: product.basis,
    kcal_100: per100.kcal,
    protein_100: per100.protein,
    carbs_100: per100.carbs,
    fat_100: per100.fat,
    serving_grams: product.servingGrams ?? undefined,
  })
  if (error && REJECTED_CODES.has(error.code)) return { kind: 'missing', hint }
  if (error) throw error
  return { kind: 'found', foodId: z.string().parse(data) }
}

/** HU-08 CA2: looks up a scanned code once; `null` waits for one. */
export function useBarcodeLookup(code: string | null) {
  return useQuery({
    queryKey: ['scan', code] as const,
    enabled: code !== null,
    // Design §4: no retry loops against OFF. A new scan is a new lookup.
    retry: false,
    gcTime: 0,
    queryFn: ({ signal }) => lookupBarcode(code!, signal),
  })
}
