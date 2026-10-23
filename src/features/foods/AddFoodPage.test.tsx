import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useLocation } from 'react-router'
import { renderWithAuth, resetSupabaseMock, signedInSession } from '@/test/renderWithAuth'
import {
  supabase as mock,
  queueQueryResult,
  queueRpcResult,
  setRpcDefault,
  setTableDefault,
} from '@/test/supabaseMock'
import { AddFoodPage } from './AddFoodPage'

vi.mock('@/lib/supabase', () => import('@/test/supabaseMock'))

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: 'food-1',
    name: 'Huevo',
    brand: null,
    basis: 'g',
    kcal_100: 148,
    protein_100: 12.4,
    carbs_100: 1,
    fat_100: 10,
    source: 'seed',
    verified: true,
    open_reports: 0,
    default_portion_id: 'portion-1',
    default_portion_name: '1 huevo',
    default_portion_grams: 50,
    ...overrides,
  }
}

function FoodDetailStub() {
  const location = useLocation()
  return <p>Detalle {location.pathname + location.search}</p>
}

function renderPage(path = '/add?meal=lunch') {
  return renderWithAuth(
    [
      { path: '/add', element: <AddFoodPage /> },
      { path: '/foods/:id', element: <FoodDetailStub /> },
    ],
    { path, session: signedInSession },
  )
}

const searchCalls = () => vi.mocked(mock.rpc).mock.calls.filter(([fn]) => fn === 'search_foods')

describe('AddFoodPage', () => {
  beforeEach(() => {
    resetSupabaseMock()
    // Thursday 22 October 2026, noon in Santiago.
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-22T15:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('preselects the meal of the "+" that opened it (HU-04 CA1)', async () => {
    renderPage('/add?meal=snack')
    const meals = await screen.findByRole('group', { name: 'Comida' })
    expect(within(meals).getByRole('button', { name: 'Colación' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('uses the meal of the hour without one (R-09)', async () => {
    vi.setSystemTime(new Date('2026-10-22T16:30:00Z')) // 13:30 in Santiago
    renderPage('/add')
    expect(await screen.findByRole('button', { name: 'Almuerzo' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    vi.useRealTimers()
  })

  it('lets the user change the meal', async () => {
    const router = renderPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Cena' }))
    expect(screen.getByRole('button', { name: 'Cena' })).toHaveAttribute('aria-pressed', 'true')
    expect(router.state.location.search).toContain('meal=dinner')
  })

  it('shows Recientes with the field empty (HU-04 CA2)', async () => {
    setRpcDefault('recent_foods', { data: [row({ name: 'Marraqueta' })], error: null })
    renderPage()
    expect(await screen.findByRole('button', { name: 'Recientes' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(await screen.findByRole('button', { name: /^Marraqueta/ })).toBeInTheDocument()
  })

  it('invites to log the first meal while Recientes is empty', async () => {
    setRpcDefault('recent_foods', { data: [], error: null })
    renderPage()
    expect(await screen.findByText('Aún no registras comidas')).toBeInTheDocument()
  })

  it('searches once the user stops typing (HU-04 CA3)', async () => {
    setRpcDefault('search_foods', {
      data: [row(), row({ id: 'food-2', name: 'Huevo duro', default_portion_id: null })],
      error: null,
    })
    renderPage()
    await userEvent.type(await screen.findByLabelText('Buscar alimento'), 'huevo')

    expect(
      await screen.findByRole('button', { name: /^Huevo\s*1 huevo · 50 g\s*74 kcal$/ }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Huevo duro\s*100 g\s*148 kcal/ }),
    ).toBeInTheDocument()
    expect(await screen.findByText('2 resultados')).toBeInTheDocument()
    expect(searchCalls()).toEqual([['search_foods', { q: 'huevo', lim: 20 }]])
  })

  it('hides the tabs while searching and shows them again when the field is cleared', async () => {
    setRpcDefault('search_foods', { data: [row()], error: null })
    renderPage()
    const field = await screen.findByLabelText('Buscar alimento')
    await userEvent.type(field, 'huevo')
    expect(screen.queryByRole('button', { name: 'Favoritos' })).not.toBeInTheDocument()

    await userEvent.clear(field)
    expect(screen.getByRole('button', { name: 'Favoritos' })).toBeInTheDocument()
  })

  it('says so when nothing matches', async () => {
    setRpcDefault('search_foods', { data: [], error: null })
    renderPage()
    await userEvent.type(await screen.findByLabelText('Buscar alimento'), 'xyz')
    expect(await screen.findByText('No encontramos “xyz”')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Crear alimento' })).toHaveAttribute(
      'href',
      '/foods/new?meal=lunch&name=xyz',
    )
  })

  it('offers to retry when the search fails', async () => {
    queueRpcResult('search_foods', { data: null, error: new Error('offline') })
    setRpcDefault('search_foods', { data: [row()], error: null })
    renderPage()
    await userEvent.type(await screen.findByLabelText('Buscar alimento'), 'huevo')

    await userEvent.click(await screen.findByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('button', { name: /^Huevo/ })).toBeInTheDocument()
  })

  it('opens the Detail with the chosen meal (HU-04 CA5)', async () => {
    setRpcDefault('search_foods', { data: [row()], error: null })
    renderPage('/add?meal=breakfast')
    await userEvent.type(await screen.findByLabelText('Buscar alimento'), 'huevo')
    await userEvent.click(await screen.findByRole('button', { name: /^Huevo/ }))
    expect(screen.getByText('Detalle /foods/food-1?meal=breakfast')).toBeInTheDocument()
  })

  it('lists favorites and the user’s own foods in their tabs', async () => {
    setRpcDefault('favorite_foods', { data: [row({ name: 'Palta Hass' })], error: null })
    setRpcDefault('my_foods', {
      data: [row({ id: 'food-9', name: 'Queque de la abuela', source: 'user' })],
      error: null,
    })
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Favoritos' }))
    expect(await screen.findByRole('button', { name: /^Palta Hass/ })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Mis alimentos' }))
    expect(await screen.findByRole('button', { name: /^Queque de la abuela/ })).toBeInTheDocument()
  })

  it('shows an empty state for a tab without foods', async () => {
    setRpcDefault('favorite_foods', { data: [], error: null })
    renderPage('/add?tab=favorites')
    expect(await screen.findByText('Aún no tienes favoritos')).toBeInTheDocument()
  })

  it('shows the brand next to the name', async () => {
    setRpcDefault('search_foods', {
      data: [row({ name: 'Galletas', brand: 'Costa' })],
      error: null,
    })
    renderPage()
    await userEvent.type(await screen.findByLabelText('Buscar alimento'), 'galletas')
    expect(await screen.findByRole('button', { name: /^Galletas · Costa/ })).toBeInTheDocument()
  })

  it('logs the default portion with the "+" of a row (HU-04 CA4)', async () => {
    setRpcDefault('search_foods', { data: [row()], error: null })
    setTableDefault('food_logs', { data: null, error: null })
    renderPage('/add?meal=breakfast')
    await userEvent.type(await screen.findByLabelText('Buscar alimento'), 'huevo')
    await userEvent.click(await screen.findByRole('button', { name: 'Agregar Huevo' }))

    expect(mock.query.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        food_id: 'food-1',
        log_date: '2026-10-22',
        meal: 'breakfast',
        portion_id: 'portion-1',
        quantity: 1,
        grams: 50,
        food_name: 'Huevo',
        kcal: 74,
        protein: 6.2,
      }),
    )
    expect(screen.getByRole('status')).toHaveTextContent('Agregaste Huevo a Desayuno')
  })

  it('logs 100 g of a food without portions, on the day being viewed', async () => {
    setRpcDefault('search_foods', {
      data: [
        row({ default_portion_id: null, default_portion_name: null, default_portion_grams: null }),
      ],
      error: null,
    })
    renderPage('/add?meal=dinner&date=2026-10-21')
    await userEvent.type(await screen.findByLabelText('Buscar alimento'), 'huevo')
    await userEvent.click(await screen.findByRole('button', { name: 'Agregar Huevo' }))

    expect(mock.query.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        log_date: '2026-10-21',
        portion_id: null,
        quantity: 100,
        grams: 100,
      }),
    )
  })

  it('carries the day to the Detail', async () => {
    setRpcDefault('search_foods', { data: [row()], error: null })
    renderPage('/add?meal=dinner&date=2026-10-21')
    await userEvent.type(await screen.findByLabelText('Buscar alimento'), 'huevo')
    await userEvent.click(await screen.findByRole('button', { name: /^Huevo/ }))
    expect(
      screen.getByText('Detalle /foods/food-1?meal=dinner&date=2026-10-21'),
    ).toBeInTheDocument()
  })

  it('says so when logging fails', async () => {
    setRpcDefault('search_foods', { data: [row()], error: null })
    queueQueryResult('food_logs', { data: null, error: new Error('offline') })
    renderPage()
    await userEvent.type(await screen.findByLabelText('Buscar alimento'), 'huevo')
    await userEvent.click(await screen.findByRole('button', { name: 'Agregar Huevo' }))
    expect(
      await screen.findByText('No pudimos agregar Huevo. Inténtalo de nuevo.'),
    ).toBeInTheDocument()
  })

  it('always offers Crear alimento, also when the lists have foods', async () => {
    setRpcDefault('my_foods', { data: [row({ name: 'Queque de la abuela' })], error: null })
    setRpcDefault('search_foods', { data: [row()], error: null })
    renderPage('/add?meal=lunch&tab=mine')
    await screen.findByRole('button', { name: /^Queque de la abuela/ })
    expect(screen.getByRole('link', { name: 'Crear alimento' })).toHaveAttribute(
      'href',
      '/foods/new?meal=lunch',
    )

    await userEvent.type(screen.getByLabelText('Buscar alimento'), 'huevo')
    await screen.findByRole('button', { name: /^Huevo/ })
    expect(screen.getByRole('link', { name: 'Crear alimento' })).toHaveAttribute(
      'href',
      '/foods/new?meal=lunch&name=huevo',
    )
  })

  it('opens the scanner from the search field and the bottom button (HU-08)', () => {
    renderPage('/add?meal=dinner&date=2026-10-20')
    const links = screen.getAllByRole('link', { name: 'Escanear código de barras' })
    expect(links).toHaveLength(2)
    for (const link of links) {
      expect(link).toHaveAttribute('href', '/scan?meal=dinner&date=2026-10-20')
    }
  })

  it('lists the scanned codes to complete in Mis alimentos (HU-12 CA5)', async () => {
    setRpcDefault('my_foods', { data: [], error: null })
    setTableDefault('shopping_list_items', {
      data: [
        {
          barcode: '7801234567894',
          label: 'Galletas',
          food_id: null,
          created_at: '2026-10-22T12:00:00Z',
        },
        {
          barcode: '96385074',
          label: 'Código 9638 5074',
          food_id: null,
          created_at: '2026-10-21T12:00:00Z',
        },
      ],
      error: null,
    })
    renderPage('/add?meal=lunch&tab=mine')
    const section = await screen.findByRole('region', { name: 'Por completar' })
    expect(within(section).getByText('Código 780 1234 567894')).toBeInTheDocument()
    expect(within(section).getByRole('link', { name: 'Completar Galletas' })).toHaveAttribute(
      'href',
      '/foods/new?meal=lunch&barcode=7801234567894&name=Galletas',
    )
    expect(
      within(section).getByRole('link', { name: 'Completar Código 9638 5074' }),
    ).toHaveAttribute('href', '/foods/new?meal=lunch&barcode=96385074')
  })
})
