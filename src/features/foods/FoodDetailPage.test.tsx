import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithAuth, resetSupabaseMock, signedInSession } from '@/test/renderWithAuth'
import {
  supabase as mock,
  queueQueryResult,
  setRpcDefault,
  setTableDefault,
} from '@/test/supabaseMock'
import { FoodDetailPage } from './FoodDetailPage'

vi.mock('@/lib/supabase', () => import('@/test/supabaseMock'))

const FOOD_ID = '7ff8520a-0974-5ad0-8a68-f436c7ecd53f'

function marraqueta(overrides: Record<string, unknown> = {}) {
  return {
    id: FOOD_ID,
    name: 'Marraqueta',
    brand: null,
    basis: 'g',
    kcal_100: 272,
    protein_100: 10.75,
    carbs_100: 49.68,
    fat_100: 2.42,
    source: 'seed',
    verified: true,
    open_reports: 0,
    barcode: null,
    food_portions: [
      { id: 'half', name: '1/2 marraqueta', grams: 50, is_default: false },
      { id: 'whole', name: '1 marraqueta', grams: 100, is_default: true },
    ],
    ...overrides,
  }
}

function given(food: unknown, favorite = false) {
  setTableDefault('foods', { data: food, error: null })
  setTableDefault('favorites', { data: favorite ? { food_id: FOOD_ID } : null, error: null })
}

function renderDetail(path = `/foods/${FOOD_ID}?meal=lunch`) {
  return renderWithAuth(
    [
      { path: '/foods/:id', element: <FoodDetailPage /> },
      { path: '/', element: <p>Hoy</p> },
    ],
    { path, session: signedInSession },
  )
}

const addButton = () => screen.getByRole('button', { name: /^Agregar a/ })

describe('FoodDetailPage', () => {
  beforeEach(() => {
    resetSupabaseMock()
    // Thursday 22 October 2026, noon in Santiago.
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-22T15:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows the default portion with its kcal and macros (HU-05 CA1)', async () => {
    given(marraqueta())
    renderDetail()

    expect(await screen.findByRole('heading', { name: 'Marraqueta' })).toBeInTheDocument()
    expect(screen.getByText('Base de alimentos')).toBeInTheDocument()
    expect(screen.getByText('1 marraqueta · 100 g')).toBeInTheDocument()
    expect(screen.getByText('272')).toBeInTheDocument()
    expect(screen.getByText('10,8 g')).toBeInTheDocument()
    expect(screen.getByText('49,7 g')).toBeInTheDocument()
    expect(screen.getByText('2,4 g')).toBeInTheDocument()
    expect(addButton()).toHaveTextContent('Agregar a Almuerzo · 272 kcal')
  })

  it('does not ask for created_by, which other users cannot read (R-11)', async () => {
    given(marraqueta())
    renderDetail()
    await screen.findByRole('heading', { name: 'Marraqueta' })
    expect(mock.query.select).toHaveBeenCalledWith(expect.not.stringContaining('created_by'))
  })

  it('recalculates live with the −/+ buttons (HU-05 CA2)', async () => {
    given(marraqueta())
    renderDetail()
    await userEvent.click(await screen.findByRole('button', { name: 'Sumar 0,5' }))

    expect(screen.getByText('1,5 × 1 marraqueta · 150 g')).toBeInTheDocument()
    expect(screen.getByLabelText('Cantidad de porciones')).toHaveValue('1,5')
    expect(addButton()).toHaveTextContent('Agregar a Almuerzo · 408 kcal')
  })

  it('switches between portions and grams, keeping the weight (HU-05 CA2)', async () => {
    given(marraqueta())
    renderDetail()
    const portions = await screen.findByRole('group', { name: 'Porción' })
    expect(
      within(portions)
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual(['1 marraqueta (100 g)', '1/2 marraqueta (50 g)', 'Gramos'])

    await userEvent.click(within(portions).getByRole('button', { name: '1/2 marraqueta (50 g)' }))
    expect(addButton()).toHaveTextContent('136 kcal')

    await userEvent.click(within(portions).getByRole('button', { name: 'Gramos' }))
    expect(screen.getByLabelText('Gramos')).toHaveValue('50')
    await userEvent.click(screen.getByRole('button', { name: 'Sumar 10' }))
    expect(screen.getByText('60 g')).toBeInTheDocument()
  })

  it('accepts a typed quantity', async () => {
    given(marraqueta())
    renderDetail()
    const quantity = await screen.findByLabelText('Cantidad de porciones')
    await userEvent.clear(quantity)
    await userEvent.type(quantity, '2,5{Enter}')
    expect(screen.getByText('2,5 × 1 marraqueta · 250 g')).toBeInTheDocument()
  })

  it('starts at 100 g for a food without portions', async () => {
    given(marraqueta({ food_portions: [], basis: 'ml', name: 'Leche' }))
    renderDetail()
    expect(await screen.findByLabelText('Mililitros')).toHaveValue('100')
    expect(screen.getByText('100 ml')).toBeInTheDocument()
  })

  it('lets the user change the target meal (HU-05 CA3)', async () => {
    given(marraqueta())
    const router = renderDetail()
    const meals = await screen.findByRole('group', { name: 'Comida' })
    await userEvent.click(within(meals).getByRole('button', { name: 'Cena' }))

    expect(addButton()).toHaveTextContent('Agregar a Cena · 272 kcal')
    expect(router.state.location.search).toContain('meal=dinner')
  })

  it('marks and unmarks a favorite (HU-05 CA5)', async () => {
    given(marraqueta())
    renderDetail()
    const star = await screen.findByRole('button', { name: 'Favorito' })
    await vi.waitFor(() => expect(star).toBeEnabled())
    expect(star).toHaveAttribute('aria-pressed', 'false')

    setTableDefault('favorites', { data: { food_id: FOOD_ID }, error: null })
    queueQueryResult('favorites', { data: null, error: null })
    await userEvent.click(star)
    expect(mock.query.insert).toHaveBeenCalledWith({ food_id: FOOD_ID })
    expect(star).toHaveAttribute('aria-pressed', 'true')

    setTableDefault('favorites', { data: null, error: null })
    queueQueryResult('favorites', { data: null, error: null })
    await userEvent.click(star)
    expect(mock.query.delete).toHaveBeenCalled()
    expect(mock.query.eq).toHaveBeenCalledWith('food_id', FOOD_ID)
    await vi.waitFor(() => expect(star).toHaveAttribute('aria-pressed', 'false'))
  })

  it('undoes the star when saving the favorite fails', async () => {
    given(marraqueta())
    renderDetail()
    const star = await screen.findByRole('button', { name: 'Favorito' })
    await vi.waitFor(() => expect(star).toBeEnabled())

    queueQueryResult('favorites', { data: null, error: new Error('offline') })
    await userEvent.click(star)
    await vi.waitFor(() => expect(star).toHaveAttribute('aria-pressed', 'false'))
  })

  it('credits community foods and Open Food Facts (R-11, design §4)', async () => {
    given(marraqueta({ source: 'off', brand: 'Ideal' }))
    renderDetail()
    expect(await screen.findByText('Ideal · Datos de Open Food Facts')).toBeInTheDocument()
  })

  it('says so when the food does not exist', async () => {
    given(null)
    renderDetail()
    expect(await screen.findByText('No encontramos este alimento')).toBeInTheDocument()
  })

  it('does not query with an id that is not a UUID', async () => {
    renderDetail('/foods/no-existe')
    expect(await screen.findByText('No encontramos este alimento')).toBeInTheDocument()
    expect(mock.from).not.toHaveBeenCalledWith('foods')
  })

  it('shows "Datos en revisión" from 3 open reports on (HU-10 CA2)', async () => {
    given(marraqueta({ source: 'user', open_reports: 3 }))
    renderDetail()
    expect(await screen.findByText('Datos en revisión.')).toBeInTheDocument()
  })

  it('does not show the notice below 3 open reports', async () => {
    given(marraqueta({ source: 'user', open_reports: 2 }))
    renderDetail()
    await screen.findByRole('heading', { name: 'Marraqueta' })
    expect(screen.queryByText('Datos en revisión.')).not.toBeInTheDocument()
  })

  it('reports an error in a community food (HU-10 CA1)', async () => {
    given(marraqueta({ source: 'user' }))
    setTableDefault('food_reports', { data: null, error: null })
    renderDetail()
    await userEvent.click(await screen.findByRole('button', { name: 'Reportar un error' }))

    await userEvent.click(screen.getByRole('button', { name: 'Enviar reporte' }))
    expect(await screen.findByText('Cuéntanos qué dato está mal')).toBeInTheDocument()
    expect(mock.query.insert).not.toHaveBeenCalled()

    await userEvent.type(screen.getByLabelText('¿Qué dato está mal?'), 'Es por 100 ml')
    await userEvent.click(screen.getByRole('button', { name: 'Enviar reporte' }))
    expect(mock.query.insert).toHaveBeenCalledWith({ food_id: FOOD_ID, reason: 'Es por 100 ml' })
    expect(
      await screen.findByText('Reportaste un error en este alimento. Gracias, lo vamos a revisar.'),
    ).toBeInTheDocument()
  })

  it('thanks instead of asking again when the user already reported it', async () => {
    given(marraqueta({ source: 'user' }))
    setTableDefault('food_reports', { data: { id: 'report-1' }, error: null })
    renderDetail()
    expect(await screen.findByText(/Reportaste un error en este alimento/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reportar un error' })).not.toBeInTheDocument()
  })

  it('does not offer reports for foods that are not from the community', async () => {
    given(marraqueta())
    renderDetail()
    await screen.findByRole('heading', { name: 'Marraqueta' })
    expect(screen.queryByRole('button', { name: 'Reportar un error' })).not.toBeInTheDocument()
  })

  it('logs the chosen amount and goes back to Hoy (HU-05 CA4)', async () => {
    given(marraqueta())
    const router = renderDetail()
    await userEvent.click(await screen.findByRole('button', { name: 'Sumar 0,5' }))
    await userEvent.click(addButton())

    expect(mock.query.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        food_id: FOOD_ID,
        log_date: '2026-10-22',
        meal: 'lunch',
        portion_id: 'whole',
        quantity: 1.5,
        grams: 150,
        food_name: 'Marraqueta',
        kcal: 408,
      }),
    )
    await vi.waitFor(() => expect(router.state.location.pathname).toBe('/'))
  })

  it('logs grams without a portion, to the day being viewed', async () => {
    given(marraqueta())
    const router = renderDetail(`/foods/${FOOD_ID}?meal=dinner&date=2026-10-21`)
    expect(await screen.findByText('Se agrega al Mié 21 oct')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Gramos' }))
    await userEvent.click(addButton())

    expect(mock.query.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        log_date: '2026-10-21',
        portion_id: null,
        quantity: 100,
        grams: 100,
      }),
    )
    await vi.waitFor(() => expect(router.state.location.search).toBe('?date=2026-10-21'))
  })

  it('stays and says so when logging fails', async () => {
    given(marraqueta())
    queueQueryResult('food_logs', { data: null, error: new Error('offline') })
    const router = renderDetail()
    await userEvent.click(await screen.findByRole('button', { name: /^Agregar a/ }))
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos agregarlo')
    expect(router.state.location.pathname).toBe(`/foods/${FOOD_ID}`)
  })

  it('lets the author edit a community food while the window is open (B-7b)', async () => {
    given(marraqueta({ source: 'user' }))
    setRpcDefault('can_edit_food', { data: true, error: null })
    renderDetail()
    expect(await screen.findByRole('link', { name: 'Editar alimento' })).toHaveAttribute(
      'href',
      `/foods/${FOOD_ID}/edit?meal=lunch`,
    )
  })

  it('hides Editar when the user may not edit it', async () => {
    given(marraqueta({ source: 'user' }))
    setRpcDefault('can_edit_food', { data: false, error: null })
    renderDetail()
    await screen.findByRole('heading', { name: 'Marraqueta' })
    await vi.waitFor(() =>
      expect(vi.mocked(mock.rpc).mock.calls.some(([fn]) => fn === 'can_edit_food')).toBe(true),
    )
    expect(screen.queryByRole('link', { name: 'Editar alimento' })).not.toBeInTheDocument()
  })
})
