import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Barcode } from '@/domain/barcode'
import type { OffLookup } from '@/lib/openFoodFacts'
import { renderWithAuth, resetSupabaseMock, signedInSession } from '@/test/renderWithAuth'
import {
  supabase as mock,
  queueQueryResult,
  queueRpcResult,
  setTableDefault,
} from '@/test/supabaseMock'
import { SupermarketPage } from './SupermarketPage'

vi.mock('@/lib/supabase', () => import('@/test/supabaseMock'))

const fetchOffProduct = vi.fn<() => Promise<OffLookup>>()
vi.mock('@/lib/openFoodFacts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/openFoodFacts')>()),
  fetchOffProduct: () => fetchOffProduct(),
}))

// The camera is out of jsdom's reach: the test plays the scanner.
const scanner = { onDetect: null as ((barcode: Barcode) => void) | null, paused: false }
vi.mock('@/features/scanner/useBarcodeScanner', () => ({
  useBarcodeScanner: (options: { onDetect: (barcode: Barcode) => void; paused: boolean }) => {
    scanner.onDetect = options.onDetect
    scanner.paused = options.paused
    return { videoRef: { current: null }, status: 'scanning', retry: vi.fn() }
  },
}))

const LIST_ID = 'a0000000-0000-4000-8000-000000000001'
const MILK_ID = 'f0000000-0000-4000-8000-000000000001'

function item(overrides: Record<string, unknown> = {}) {
  return {
    id: 'i1',
    label: 'leche',
    food_id: null,
    barcode: null,
    quantity: 1,
    source: 'manual',
    checked_at: null,
    created_at: '2026-10-23T12:00:00Z',
    food: null,
    ...overrides,
  }
}

const milkFood = { name: 'Leche Entera', brand: 'Soprole', basis: 'ml', kcal_100: 61 }

function list(items: unknown[]) {
  return {
    id: LIST_ID,
    name: 'Compras',
    created_at: '2026-10-23T11:00:00Z',
    shopping_list_items: items,
  }
}

function renderPage() {
  return renderWithAuth([{ path: '/shopping/scan', element: <SupermarketPage /> }], {
    path: '/shopping/scan',
    session: signedInSession,
  })
}

/** Scans a code and waits until the page is ready for the next one. */
async function scan(code: string) {
  act(() => scanner.onDetect?.({ code, format: 'ean_13' }))
  expect(scanner.paused).toBe(true)
  await vi.waitFor(() => expect(scanner.paused).toBe(false))
}

const rpcCalls = (fn: string) =>
  vi
    .mocked(mock.rpc)
    .mock.calls.filter(([name]) => name === fn)
    .map(([, args]) => args)

describe('SupermarketPage', () => {
  beforeEach(() => {
    resetSupabaseMock()
    fetchOffProduct.mockReset()
    // Friday 23 October 2026, noon in Santiago.
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-23T15:00:00Z'))
  })

  afterEach(() => vi.useRealTimers())

  it('starts an "Escaneo dd/mm" list with the first scan when there is none (design)', async () => {
    queueQueryResult(
      'shopping_lists',
      { data: null, error: null },
      { data: { id: LIST_ID }, error: null },
    )
    setTableDefault('shopping_lists', {
      data: list([
        item({
          id: 'i9',
          label: 'Leche Entera · Soprole',
          barcode: '96385074',
          food_id: MILK_ID,
          food: milkFood,
          checked_at: '2026-10-23T15:00:00Z',
        }),
      ]),
      error: null,
    })
    queueQueryResult('foods', {
      data: { id: MILK_ID, name: 'Leche Entera', brand: 'Soprole' },
      error: null,
    })
    queueRpcResult('scan_into_list', { data: { item_id: 'i9', outcome: 'added' }, error: null })
    renderPage()
    await screen.findByText('Apunta al código de barras')

    await scan('96385074')
    expect(mock.query.insert).toHaveBeenCalledWith({ name: 'Escaneo 23/10' })
    expect(rpcCalls('scan_into_list')).toEqual([
      {
        list_id: LIST_ID,
        barcode: '96385074',
        label: 'Leche Entera · Soprole',
        food_id: MILK_ID,
        claim_item_id: undefined,
      },
    ])
    expect(await screen.findByText('Agregaste Leche Entera · Soprole')).toBeInTheDocument()
    const scanned = screen.getByRole('list', { name: 'Escaneados' })
    expect(within(scanned).getByText('61 kcal · 100 ml')).toBeInTheDocument()
    expect(screen.getByText('1 escaneado')).toBeInTheDocument()
  })

  it('marks the item of the list the product belongs to (HU-12 CA2)', async () => {
    setTableDefault('shopping_lists', {
      data: list([item(), item({ id: 'i2', label: 'pan' })]),
      error: null,
    })
    queueQueryResult('foods', {
      data: { id: MILK_ID, name: 'Leche Entera', brand: 'Soprole' },
      error: null,
    })
    queueRpcResult('scan_into_list', { data: { item_id: 'i1', outcome: 'claimed' }, error: null })
    renderPage()
    expect(await screen.findByText('leche, pan')).toBeInTheDocument()

    await scan('96385074')
    expect(rpcCalls('scan_into_list')[0]).toMatchObject({ claim_item_id: 'i1' })
    expect(await screen.findByText('Marcaste leche de tu lista')).toBeInTheDocument()
  })

  it('asks which item when several fit, and adds it apart on "Ninguno"', async () => {
    setTableDefault('shopping_lists', {
      data: list([item(), item({ id: 'i2', label: 'leche entera' })]),
      error: null,
    })
    queueQueryResult('foods', {
      data: { id: MILK_ID, name: 'Leche Entera', brand: 'Soprole' },
      error: null,
    })
    queueRpcResult('scan_into_list', { data: { item_id: 'i2', outcome: 'claimed' }, error: null })
    renderPage()
    await screen.findByText(/Te falta/)

    act(() => scanner.onDetect?.({ code: '96385074', format: 'ean_13' }))
    const sheet = await screen.findByRole('dialog', { name: '¿Cuál de tu lista es?' })
    expect(scanner.paused).toBe(true)
    await userEvent.click(within(sheet).getByRole('button', { name: 'leche entera' }))
    expect(rpcCalls('scan_into_list')[0]).toMatchObject({ claim_item_id: 'i2' })
    expect(await screen.findByText('Marcaste leche entera de tu lista')).toBeInTheDocument()
    expect(scanner.paused).toBe(false)
  })

  it('keeps an unknown product as pending, with Completar (HU-12 CA4)', async () => {
    setTableDefault('shopping_lists', {
      data: list([
        item({
          id: 'i3',
          label: 'Código 780 1234 567894',
          barcode: '7801234567894',
          source: 'scan',
          checked_at: '2026-10-23T15:00:00Z',
        }),
      ]),
      error: null,
    })
    fetchOffProduct.mockResolvedValue({ status: 'not_found' })
    queueRpcResult('scan_into_list', { data: { item_id: 'i3', outcome: 'added' }, error: null })
    renderPage()
    await screen.findByText('Apunta al código de barras')

    await scan('7801234567894')
    expect(rpcCalls('scan_into_list')[0]).toMatchObject({
      label: 'Código 780 1234 567894',
      food_id: undefined,
    })
    expect(await screen.findByText('Sin tabla nutricional')).toBeInTheDocument()
    expect(screen.getByText('1 por completar')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Completar Código 780 1234 567894' })).toHaveAttribute(
      'href',
      '/foods/new?barcode=7801234567894',
    )
  })

  it('counts a repeat once in the list, with its quantity (HU-12 CA6)', async () => {
    setTableDefault('shopping_lists', {
      data: list([
        item({
          barcode: '96385074',
          food_id: MILK_ID,
          food: milkFood,
          quantity: 2,
          checked_at: '2026-10-23T15:00:00Z',
        }),
      ]),
      error: null,
    })
    queueQueryResult(
      'foods',
      { data: { id: MILK_ID, name: 'Leche Entera', brand: 'Soprole' }, error: null },
      { data: { id: MILK_ID, name: 'Leche Entera', brand: 'Soprole' }, error: null },
    )
    queueRpcResult(
      'scan_into_list',
      { data: { item_id: 'i1', outcome: 'repeat' }, error: null },
      { data: { item_id: 'i1', outcome: 'repeat' }, error: null },
    )
    renderPage()
    await screen.findByText('Apunta al código de barras')
    await scan('96385074')
    await scan('96385074')

    expect(await screen.findByText('Sumaste otro: Leche Entera · Soprole')).toBeInTheDocument()
    const scanned = screen.getByRole('list', { name: 'Escaneados' })
    expect(within(scanned).getAllByRole('listitem')).toHaveLength(1)
    expect(within(scanned).getByText('Leche Entera · Soprole')).toBeInTheDocument()
    expect(within(scanned).getByText('× 2')).toBeInTheDocument()
    expect(screen.getByText('2 escaneados')).toBeInTheDocument()
  })

  it('says so when a scan cannot be saved, and keeps scanning', async () => {
    setTableDefault('shopping_lists', { data: list([]), error: null })
    queueQueryResult('foods', { data: null, error: { message: 'offline' } })
    renderPage()
    await screen.findByText('Apunta al código de barras')
    await scan('96385074')
    expect(
      await screen.findByText(
        'No pudimos guardar ese código. Revisa tu conexión e inténtalo de nuevo.',
      ),
    ).toBeInTheDocument()
    expect(scanner.paused).toBe(false)
  })
})
