import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useLocation } from 'react-router'
import { AddFoodPage } from '@/features/foods/AddFoodPage'
import { renderWithAuth, resetSupabaseMock, signedInSession } from '@/test/renderWithAuth'
import { supabase as mock, setRpcDefault } from '@/test/supabaseMock'

vi.mock('@/lib/supabase', () => import('@/test/supabaseMock'))

const CHICKEN_ID = '11111111-1111-4111-8111-111111111111'

/** 1,700 g raw at 110 kcal and 23 g of protein per 100 g, 1,275 g cooked. */
function prep(overrides: Record<string, unknown> = {}) {
  return {
    id: CHICKEN_ID,
    name: 'Pollo a la plancha',
    cooked_on: '2026-10-26',
    cooked_grams: 1275,
    servings: 5,
    finished_at: null,
    created_at: '2026-10-26T20:00:00Z',
    logged_grams: 330,
    ingredients: [
      {
        food_id: 'food-chicken',
        food_name: 'Pechuga de pollo cruda',
        grams: 1700,
        kcal_100: 110,
        protein_100: 23,
        carbs_100: 0,
        fat_100: 1.5,
      },
    ],
    ...overrides,
  }
}

function Where() {
  const location = useLocation()
  return <p>En {location.pathname + location.search}</p>
}

function renderAdd(path = '/add?meal=lunch') {
  return renderWithAuth(
    [
      { path: '/add', element: <AddFoodPage /> },
      { path: '/', element: <Where /> },
    ],
    { path, session: signedInSession },
  )
}

const inserted = () => vi.mocked(mock.query.insert).mock.calls.map(([row]) => row as object)

describe('logging a meal prep from Agregar (HU-18)', () => {
  beforeEach(() => {
    resetSupabaseMock()
    vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-28T15:00:00Z'))
    setRpcDefault('recent_foods', { data: [], error: null })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('lists the active batches with what is left and their days (CA1)', async () => {
    setRpcDefault('my_meal_preps', {
      data: [prep(), prep({ id: 'done', name: 'Arroz', finished_at: '2026-10-27T12:00:00Z' })],
      error: null,
    })
    renderAdd()

    const section = await screen.findByRole('region', { name: 'Tus meal prep' })
    expect(within(section).getAllByRole('button')).toHaveLength(1)
    expect(within(section).getByRole('button', { name: /Pollo a la plancha/ })).toHaveTextContent(
      'Quedan 945 g · 3 porciones · cocinado hace 2 días',
    )
  })

  it('logs one serving by default, against the batch (CA2, CA3)', async () => {
    setRpcDefault('my_meal_preps', { data: [prep()], error: null })
    renderAdd()

    await userEvent.click(await screen.findByRole('button', { name: /Pollo a la plancha/ }))
    const sheet = screen.getByRole('dialog', { name: 'Pollo a la plancha' })
    expect(within(sheet).getByRole('button', { name: 'Porción (255 g)' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    // 1,870 kcal over 1,275 g: a 255 g serving has 374 kcal.
    await userEvent.click(
      within(sheet).getByRole('button', { name: 'Agregar a Almuerzo · 374 kcal' }),
    )

    expect(await screen.findByText('En /')).toBeInTheDocument()
    expect(inserted()).toEqual([
      expect.objectContaining({
        food_id: null,
        meal_prep_id: CHICKEN_ID,
        meal: 'lunch',
        log_date: '2026-10-28',
        portion_id: null,
        quantity: 255,
        grams: 255,
        food_name: 'Pollo a la plancha',
        // Not rounded: rounding is for display only.
        kcal: expect.closeTo(374, 6),
        protein: expect.closeTo(78.2, 6),
      }),
    ])
  })

  it('logs cooked grams, starting from the serving weight', async () => {
    setRpcDefault('my_meal_preps', { data: [prep()], error: null })
    renderAdd()

    await userEvent.click(await screen.findByRole('button', { name: /Pollo a la plancha/ }))
    const sheet = screen.getByRole('dialog', { name: 'Pollo a la plancha' })
    await userEvent.click(within(sheet).getByRole('button', { name: 'Gramos' }))
    const grams = within(sheet).getByLabelText('Gramos cocidos')
    expect(grams).toHaveValue('255')
    await userEvent.clear(grams)
    await userEvent.type(grams, '150{Enter}')
    await userEvent.click(
      within(sheet).getByRole('button', { name: /^Agregar a Almuerzo · 220 kcal$/ }),
    )

    expect(await screen.findByText('En /')).toBeInTheDocument()
    expect(inserted()[0]).toMatchObject({ quantity: 150, grams: 150 })
  })

  it('starts at 100 g for a batch without servings', async () => {
    setRpcDefault('my_meal_preps', { data: [prep({ servings: null })], error: null })
    renderAdd()

    await userEvent.click(await screen.findByRole('button', { name: /Pollo a la plancha/ }))
    const sheet = screen.getByRole('dialog', { name: 'Pollo a la plancha' })
    expect(within(sheet).queryByRole('group', { name: 'Medida' })).not.toBeInTheDocument()
    expect(within(sheet).getByLabelText('Gramos cocidos')).toHaveValue('100')
  })

  it('goes back to that day when logging another one', async () => {
    setRpcDefault('my_meal_preps', { data: [prep()], error: null })
    renderAdd('/add?meal=dinner&date=2026-10-27')

    await userEvent.click(await screen.findByRole('button', { name: /Pollo a la plancha/ }))
    await userEvent.click(screen.getByRole('button', { name: /^Agregar a Cena/ }))
    expect(await screen.findByText('En /?date=2026-10-27')).toBeInTheDocument()
    expect(inserted()[0]).toMatchObject({ log_date: '2026-10-27', meal: 'dinner' })
  })

  it('hides the batches while searching', async () => {
    setRpcDefault('my_meal_preps', { data: [prep()], error: null })
    setRpcDefault('search_foods', { data: [], error: null })
    renderAdd()
    await screen.findByRole('region', { name: 'Tus meal prep' })
    await userEvent.type(screen.getByLabelText('Buscar alimento'), 'pan')
    expect(screen.queryByRole('region', { name: 'Tus meal prep' })).not.toBeInTheDocument()
  })
})
