import { queueQueryResult, queueRpcResult, resetQueryResults, supabase } from '@/test/supabaseMock'
import type { OffLookup } from '@/lib/openFoodFacts'
import { lookupBarcode } from './api'

vi.mock('@/lib/supabase', () => import('@/test/supabaseMock'))

const fetchOffProduct = vi.fn<() => Promise<OffLookup>>()
vi.mock('@/lib/openFoodFacts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/openFoodFacts')>()),
  fetchOffProduct: () => fetchOffProduct(),
}))

const signal = new AbortController().signal
const FOOD_ID = '11111111-1111-4111-8111-111111111111'

const cocaCola: OffLookup = {
  status: 'found',
  product: {
    name: 'Coca-Cola Original',
    brand: 'Coca-Cola',
    basis: 'ml',
    per100: { kcal: 42.4, protein: 0, carbs: 10.6, fat: 0 },
    servingGrams: 330,
  },
}

beforeEach(() => {
  resetQueryResults()
  vi.clearAllMocks()
})

describe('lookupBarcode', () => {
  it('finds the food in the own base without asking OFF (R-10)', async () => {
    queueQueryResult('foods', {
      data: { id: FOOD_ID, name: 'Atún', brand: 'Van Camp' },
      error: null,
    })
    expect(await lookupBarcode('5449000000996', signal)).toEqual({
      kind: 'found',
      foodId: FOOD_ID,
      name: 'Atún · Van Camp',
    })
    expect(supabase.query.eq).toHaveBeenCalledWith('barcode', '5449000000996')
    expect(fetchOffProduct).not.toHaveBeenCalled()
  })

  it('imports a complete OFF product and opens it', async () => {
    fetchOffProduct.mockResolvedValue(cocaCola)
    queueRpcResult('import_off_product', { data: FOOD_ID, error: null })
    expect(await lookupBarcode('5449000000996', signal)).toEqual({
      kind: 'found',
      foodId: FOOD_ID,
      name: 'Coca-Cola Original · Coca-Cola',
    })
    expect(supabase.rpc).toHaveBeenCalledWith('import_off_product', {
      barcode: '5449000000996',
      name: 'Coca-Cola Original',
      brand: 'Coca-Cola',
      basis: 'ml',
      kcal_100: 42.4,
      protein_100: 0,
      carbs_100: 10.6,
      fat_100: 0,
      serving_grams: 330,
    })
  })

  it('offers to complete a product with missing values, keeping what OFF knew', async () => {
    fetchOffProduct.mockResolvedValue({
      status: 'found',
      product: { ...cocaCola.product, per100: { kcal: 42.4, carbs: 10.6 } },
    } as OffLookup)
    expect(await lookupBarcode('5449000000996', signal)).toEqual({
      kind: 'missing',
      hint: { name: 'Coca-Cola Original', brand: 'Coca-Cola' },
    })
    expect(supabase.rpc).not.toHaveBeenCalled()
  })

  it('does not import values far from 4/4/9', async () => {
    fetchOffProduct.mockResolvedValue({
      status: 'found',
      product: { ...cocaCola.product, per100: { kcal: 180, protein: 0, carbs: 10.6, fat: 0 } },
    } as OffLookup)
    expect((await lookupBarcode('5449000000996', signal)).kind).toBe('missing')
    expect(supabase.rpc).not.toHaveBeenCalled()
  })

  it('treats values the RPC turns away as missing', async () => {
    fetchOffProduct.mockResolvedValue(cocaCola)
    queueRpcResult('import_off_product', { data: null, error: { code: '23514' } })
    expect((await lookupBarcode('5449000000996', signal)).kind).toBe('missing')
  })

  it('passes on OFF not having it, or not answering', async () => {
    fetchOffProduct.mockResolvedValueOnce({ status: 'not_found' })
    expect(await lookupBarcode('7801234567894', signal)).toEqual({ kind: 'missing', hint: null })

    fetchOffProduct.mockResolvedValueOnce({ status: 'unavailable' })
    expect(await lookupBarcode('7801234567894', signal)).toEqual({ kind: 'unavailable' })
  })

  it('throws when the own base cannot be read', async () => {
    queueQueryResult('foods', { data: null, error: { message: 'offline' } })
    await expect(lookupBarcode('7801234567894', signal)).rejects.toEqual({ message: 'offline' })
  })
})
