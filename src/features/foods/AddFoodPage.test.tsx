import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useLocation } from 'react-router'
import { renderWithAuth, resetSupabaseMock, signedInSession } from '@/test/renderWithAuth'
import { supabase as mock, queueRpcResult, setRpcDefault } from '@/test/supabaseMock'
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
    vi.useFakeTimers({ toFake: ['Date'] })
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
    renderPage()
    expect(await screen.findByRole('button', { name: 'Recientes' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByText('Aún no registras comidas')).toBeInTheDocument()
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
    expect(await screen.findByRole('button', { name: /Palta Hass/ })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Mis alimentos' }))
    expect(await screen.findByRole('button', { name: /Queque de la abuela/ })).toBeInTheDocument()
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
    expect(await screen.findByRole('button', { name: /Galletas · Costa/ })).toBeInTheDocument()
  })
})
