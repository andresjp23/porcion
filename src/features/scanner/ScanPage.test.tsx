import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useLocation } from 'react-router'
import type { Barcode } from '@/domain/barcode'
import type { OffLookup } from '@/lib/openFoodFacts'
import { renderWithAuth, resetSupabaseMock, signedInSession } from '@/test/renderWithAuth'
import { queueQueryResult, queueRpcResult } from '@/test/supabaseMock'
import { ScanPage } from './ScanPage'
import type { ScannerStatus } from './useBarcodeScanner'

vi.mock('@/lib/supabase', () => import('@/test/supabaseMock'))

const fetchOffProduct = vi.fn<() => Promise<OffLookup>>()
vi.mock('@/lib/openFoodFacts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/openFoodFacts')>()),
  fetchOffProduct: () => fetchOffProduct(),
}))

// The camera is out of jsdom's reach: the test plays the scanner.
const scanner = {
  status: 'scanning' as ScannerStatus,
  onDetect: null as ((barcode: Barcode) => void) | null,
  paused: false,
  retry: vi.fn(),
}
vi.mock('./useBarcodeScanner', () => ({
  useBarcodeScanner: (options: { onDetect: (barcode: Barcode) => void; paused: boolean }) => {
    scanner.onDetect = options.onDetect
    scanner.paused = options.paused
    return { videoRef: { current: null }, status: scanner.status, retry: scanner.retry }
  },
}))

const FOOD_ID = '11111111-1111-4111-8111-111111111111'

function Stub({ name }: { name: string }) {
  const location = useLocation()
  return <p>{`${name} ${location.pathname}${location.search}`}</p>
}

function renderPage(path = '/scan?meal=lunch') {
  return renderWithAuth(
    [
      { path: '/scan', element: <ScanPage /> },
      { path: '/foods/new', element: <Stub name="Crear" /> },
      { path: '/foods/:id', element: <Stub name="Detalle" /> },
      { path: '/add', element: <Stub name="Agregar" /> },
    ],
    { path, session: signedInSession },
  )
}

function scan(code: string) {
  act(() => scanner.onDetect?.({ code, format: 'ean_13' }))
}

beforeEach(() => {
  resetSupabaseMock()
  fetchOffProduct.mockReset()
  scanner.status = 'scanning'
})

describe('ScanPage', () => {
  it('opens the Detail of a food already in the base, keeping meal and day (HU-08 CA3)', async () => {
    queueQueryResult('foods', { data: { id: FOOD_ID }, error: null })
    renderPage('/scan?meal=lunch&date=2026-10-20')
    expect(screen.getByText('Centra el código de barras en el recuadro')).toBeInTheDocument()

    scan('7801234567894')
    expect(scanner.paused).toBe(true)
    expect(
      await screen.findByText(`Detalle /foods/${FOOD_ID}?meal=lunch&date=2026-10-20`),
    ).toBeInTheDocument()
  })

  it('imports a complete product from Open Food Facts and opens it (R-10)', async () => {
    fetchOffProduct.mockResolvedValue({
      status: 'found',
      product: {
        name: 'Coca-Cola Original',
        brand: 'Coca-Cola',
        basis: 'ml',
        per100: { kcal: 42.4, protein: 0, carbs: 10.6, fat: 0 },
        servingGrams: 330,
      },
    })
    queueRpcResult('import_off_product', { data: FOOD_ID, error: null })
    renderPage()
    scan('5449000000996')
    expect(await screen.findByText(`Detalle /foods/${FOOD_ID}?meal=lunch`)).toBeInTheDocument()
  })

  it('offers to create, search or scan another when nobody has it (HU-08 CA4)', async () => {
    fetchOffProduct.mockResolvedValue({ status: 'not_found' })
    renderPage()
    scan('7801234567894')

    expect(
      await screen.findByRole('dialog', { name: 'No encontramos este producto' }),
    ).toBeVisible()
    expect(screen.getByText('Código 780 1234 567894')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Buscar por nombre' })).toHaveAttribute(
      'href',
      '/add?meal=lunch',
    )

    await userEvent.click(screen.getByRole('button', { name: 'Escanear otro' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(scanner.paused).toBe(false)

    scan('7801234567894')
    await userEvent.click(
      await screen.findByRole('link', { name: 'Crear alimento con este código' }),
    )
    expect(
      await screen.findByText('Crear /foods/new?meal=lunch&barcode=7801234567894'),
    ).toBeInTheDocument()
  })

  it('prefills Crear alimento with what OFF knew of an incomplete product', async () => {
    fetchOffProduct.mockResolvedValue({
      status: 'found',
      product: {
        name: 'Leche entera',
        brand: 'Soprole',
        basis: 'ml',
        per100: { kcal: 61 },
        servingGrams: null,
      },
    })
    renderPage()
    scan('7802900000003')
    expect(await screen.findByText(/le faltan datos de su tabla nutricional/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Crear alimento con este código' })).toHaveAttribute(
      'href',
      '/foods/new?meal=lunch&barcode=7802900000003&name=Leche+entera&brand=Soprole',
    )
    expect(screen.getByRole('link', { name: 'Buscar por nombre' })).toHaveAttribute(
      'href',
      '/add?meal=lunch&q=Leche+entera',
    )
  })

  it('says when Open Food Facts does not answer, and lets the user try again', async () => {
    fetchOffProduct.mockResolvedValueOnce({ status: 'unavailable' })
    renderPage()
    scan('7801234567894')
    expect(await screen.findByRole('dialog', { name: 'No pudimos consultar ahora' })).toBeVisible()

    fetchOffProduct.mockResolvedValueOnce({ status: 'not_found' })
    await userEvent.click(screen.getByRole('button', { name: 'Intentar de nuevo' }))
    expect(
      await screen.findByRole('dialog', { name: 'No encontramos este producto' }),
    ).toBeVisible()
    expect(fetchOffProduct).toHaveBeenCalledTimes(2)
  })

  it('explains how to allow the camera and lets the user type the code (HU-08 CA1)', async () => {
    scanner.status = 'denied'
    queueQueryResult('foods', { data: { id: FOOD_ID }, error: null })
    renderPage()

    expect(screen.getByRole('heading', { name: 'Necesitamos permiso para usar la cámara' }))
    expect(screen.getByText(/Ajustes › Safari › Cámara/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Intentar de nuevo' }))
    expect(scanner.retry).toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: 'Escribir el código' }))
    const input = screen.getByLabelText('Código de barras')
    await userEvent.type(input, '780 1234 567891')
    await userEvent.click(screen.getByRole('button', { name: 'Buscar producto' }))
    expect(
      screen.getByText('Revisa el código: tiene 8, 12 o 13 dígitos, y el último no coincide'),
    ).toBeInTheDocument()

    await userEvent.clear(input)
    await userEvent.type(input, '780 1234 567894')
    await userEvent.click(screen.getByRole('button', { name: 'Buscar producto' }))
    expect(await screen.findByText(`Detalle /foods/${FOOD_ID}?meal=lunch`)).toBeInTheDocument()
  })

  it('tells the user when there is no camera', () => {
    scanner.status = 'unavailable'
    renderPage()
    expect(screen.getByRole('heading', { name: 'No pudimos abrir la cámara' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Escribir el código' })).toBeInTheDocument()
  })

  it('goes back to Agregar alimento when opened directly', async () => {
    renderPage('/scan?meal=dinner')
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar escáner' }))
    expect(await screen.findByText('Agregar /add?meal=dinner')).toBeInTheDocument()
  })
})
