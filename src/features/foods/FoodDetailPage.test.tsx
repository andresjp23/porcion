import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithAuth, resetSupabaseMock, signedInSession } from '@/test/renderWithAuth'
import { supabase as mock, queueQueryResult, setTableDefault } from '@/test/supabaseMock'
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
  return renderWithAuth([{ path: '/foods/:id', element: <FoodDetailPage /> }], {
    path,
    session: signedInSession,
  })
}

const addButton = () => screen.getByRole('button', { name: /^Agregar a/ })

describe('FoodDetailPage', () => {
  beforeEach(() => {
    resetSupabaseMock()
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
})
