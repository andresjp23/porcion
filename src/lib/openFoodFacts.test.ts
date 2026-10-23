import { completeNutrients, fetchOffProduct, OFF_USER_AGENT } from './openFoodFacts'

const fetchMock = vi.fn<typeof fetch>()

function respond(status: number, body: unknown) {
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(body), { status }))
}

// Trimmed from a real v3 response.
const cocaCola = {
  code: '5449000000996',
  status: 'success',
  product: {
    product_name: 'Coca-Cola Original',
    product_name_es: 'Coca-Cola Original',
    brands: 'Coca-Cola, COCA-COLA SERVICES SA/NV',
    product_quantity_unit: 'ml',
    serving_quantity: 330,
    nutriments: {
      'energy-kcal_100g': 42.4,
      'energy-kj_100g': 180,
      proteins_100g: 0,
      carbohydrates_100g: 10.6,
      fat_100g: 0,
    },
  },
}

beforeEach(() => vi.stubGlobal('fetch', fetchMock))
afterEach(() => {
  vi.unstubAllGlobals()
  fetchMock.mockReset()
})

describe('fetchOffProduct', () => {
  it('asks v3 for the fields it uses and identifies the app', async () => {
    respond(200, cocaCola)
    await fetchOffProduct('5449000000996')
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toMatch(/^https:\/\/world\.openfoodfacts\.org\/api\/v3\/product\/5449000000996\?/)
    expect(String(url)).toContain(
      'fields=product_name,product_name_es,brands,nutriments,quantity,product_quantity_unit',
    )
    expect(init?.headers).toEqual({ 'X-User-Agent': OFF_USER_AGENT })
  })

  it('maps a complete product', async () => {
    respond(200, cocaCola)
    expect(await fetchOffProduct('5449000000996')).toEqual({
      status: 'found',
      product: {
        name: 'Coca-Cola Original',
        brand: 'Coca-Cola',
        basis: 'ml',
        per100: { kcal: 42.4, protein: 0, carbs: 10.6, fat: 0 },
        servingGrams: 330,
      },
    })
  })

  it('prefers the Spanish name, and converts kJ when kcal is missing', async () => {
    respond(200, {
      product: {
        product_name: 'Whole milk',
        product_name_es: 'Leche entera',
        product_quantity_unit: 'L',
        nutriments: { 'energy-kj_100g': '255.2', proteins_100g: '3.2', fat_100g: 3.3 },
      },
    })
    const result = await fetchOffProduct('7802900000003')
    expect(result.status === 'found' && result.product).toMatchObject({
      name: 'Leche entera',
      brand: null,
      basis: 'ml',
      per100: { protein: 3.2, carbs: undefined, fat: 3.3 },
      servingGrams: null,
    })
    expect(result.status === 'found' && result.product.per100.kcal).toBeCloseTo(61, 1)
  })

  it('tells liquids apart by the package size when the unit field is missing', async () => {
    respond(200, { product: { product_name: 'Jugo', quantity: '1,5 L', nutriments: {} } })
    const result = await fetchOffProduct('7802900000003')
    expect(result.status === 'found' && result.product.basis).toBe('ml')

    respond(200, { product: { product_name: 'Galletas', quantity: '120 g', nutriments: {} } })
    const solid = await fetchOffProduct('7802900000003')
    expect(solid.status === 'found' && solid.product.basis).toBe('g')
  })

  it('treats odd values as missing instead of failing', async () => {
    respond(200, {
      product: {
        product_name: '   ',
        serving_quantity: 0,
        nutriments: {
          'energy-kcal_100g': '',
          proteins_100g: -2,
          carbohydrates_100g: 'n/a',
          fat_100g: null,
        },
      },
    })
    const result = await fetchOffProduct('7802900000003')
    expect(result).toEqual({
      status: 'found',
      product: {
        name: null,
        brand: null,
        basis: 'g',
        per100: { kcal: undefined, protein: undefined, carbs: undefined, fat: undefined },
        servingGrams: null,
      },
    })
  })

  it('reports a product OFF does not have', async () => {
    respond(404, { status: 'failure', result: { id: 'product_not_found' } })
    expect(await fetchOffProduct('7801234567894')).toEqual({ status: 'not_found' })
  })

  it.each([429, 503, 500])('reports %i as unavailable, without retrying', async (status) => {
    respond(status, {})
    expect(await fetchOffProduct('7801234567894')).toEqual({ status: 'unavailable' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('reports a network error or an unreadable body as unavailable', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    expect(await fetchOffProduct('7801234567894')).toEqual({ status: 'unavailable' })

    fetchMock.mockResolvedValueOnce(new Response('<html>', { status: 200 }))
    expect(await fetchOffProduct('7801234567894')).toEqual({ status: 'unavailable' })
  })

  it('lets an abort through', async () => {
    const controller = new AbortController()
    controller.abort()
    fetchMock.mockRejectedValueOnce(new DOMException('aborted', 'AbortError'))
    await expect(fetchOffProduct('7801234567894', controller.signal)).rejects.toThrow('aborted')
  })
})

describe('completeNutrients', () => {
  it('needs all four values', () => {
    expect(completeNutrients({ kcal: 42, protein: 0, carbs: 10.6, fat: 0 })).toEqual({
      kcal: 42,
      protein: 0,
      carbs: 10.6,
      fat: 0,
    })
    expect(completeNutrients({ kcal: 42, protein: 0, fat: 0 })).toBeNull()
  })
})
