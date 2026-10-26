import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useLocation } from 'react-router'
import { renderWithAuth, resetSupabaseMock, signedInSession } from '@/test/renderWithAuth'
import { supabase as mock, setRpcDefault } from '@/test/supabaseMock'
import { MealPrepListPage } from './MealPrepListPage'
import { MealPrepPage } from './MealPrepPage'

vi.mock('@/lib/supabase', () => import('@/test/supabaseMock'))

const CHICKEN_ID = '11111111-1111-4111-8111-111111111111'
const RICE_ID = '22222222-2222-4222-8222-222222222222'

/** A my_meal_preps row. The chicken: 1,700 g raw, 1,275 g cooked, in 5 tuppers. */
function row(overrides: Record<string, unknown> = {}) {
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

function renderAt(path: string) {
  return renderWithAuth(
    [
      { path: '/meal-prep', element: <MealPrepListPage /> },
      { path: '/meal-prep/:id', element: <MealPrepPage /> },
      { path: '/meal-prep/new', element: <Where /> },
      { path: '/meal-prep/:id/edit', element: <Where /> },
    ],
    { path, session: signedInSession },
  )
}

const today = (date: string) => vi.setSystemTime(new Date(`${date}T15:00:00Z`))

beforeEach(() => {
  resetSupabaseMock()
  vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ['Date'] })
  today('2026-10-28')
})

afterEach(() => {
  vi.useRealTimers()
})

describe('MealPrepListPage', () => {
  it('shows active batches with what is left, then the finished ones (HU-19)', async () => {
    setRpcDefault('my_meal_preps', {
      data: [
        row(),
        row({ id: RICE_ID, name: 'Arroz', cooked_on: '2026-10-20', logged_grams: 1275 }),
      ],
      error: null,
    })
    renderAt('/meal-prep')

    const active = await screen.findByRole('region', { name: 'Activos' })
    const chicken = within(active).getByRole('link', { name: /Pollo a la plancha/ })
    expect(chicken).toHaveTextContent('Quedan 945 g · 3 porciones')
    expect(chicken).toHaveTextContent('Cocinado hace 2 días')
    expect(chicken).toHaveAttribute('href', `/meal-prep/${CHICKEN_ID}`)

    // Rice ran out, so it finished on its own (R-14).
    const finished = screen.getByRole('region', { name: 'Terminados' })
    expect(within(finished).getByRole('link', { name: /Arroz/ })).toBeInTheDocument()
  })

  it('adds the neutral freshness note from day 4 (R-15)', async () => {
    today('2026-10-30')
    setRpcDefault('my_meal_preps', { data: [row()], error: null })
    renderAt('/meal-prep')
    expect(await screen.findByRole('link', { name: /Pollo a la plancha/ })).toHaveTextContent(
      'Cocinado hace 4 días · Revisa que siga bien antes de comerlo',
    )
  })

  it('explains meal prep when there is none yet', async () => {
    setRpcDefault('my_meal_preps', { data: [], error: null })
    renderAt('/meal-prep')
    expect(await screen.findByText('Aún no tienes meal prep')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Nuevo meal prep' })).toHaveAttribute(
      'href',
      '/meal-prep/new',
    )
  })
})

describe('MealPrepPage', () => {
  it('shows what is left, what it has per 100 g cooked and per serving', async () => {
    setRpcDefault('my_meal_preps', { data: [row()], error: null })
    renderAt(`/meal-prep/${CHICKEN_ID}`)

    expect(await screen.findByRole('heading', { name: 'Pollo a la plancha' })).toBeInTheDocument()
    expect(screen.getByText('Quedan 945 g · 3 porciones')).toBeInTheDocument()
    expect(screen.getByRole('meter', { name: 'Lo que queda' })).toHaveAttribute(
      'aria-valuetext',
      '945 de 1.275 g',
    )
    // 1,870 kcal over 1,275 g cooked.
    expect(screen.getByText('Por 100 g cocidos').nextSibling).toHaveTextContent('147 kcal')
    expect(screen.getByText('Por porción (255 g)').nextSibling).toHaveTextContent('374 kcal')
    expect(screen.getByText('Pechuga de pollo cruda').nextSibling).toHaveTextContent('1.700 g')
    expect(screen.getByRole('link', { name: 'Editar' })).toHaveAttribute(
      'href',
      `/meal-prep/${CHICKEN_ID}/edit`,
    )
  })

  it('finishes by hand, and reactivates while there is some left (HU-19 CA1, CA2)', async () => {
    setRpcDefault('my_meal_preps', { data: [row()], error: null })
    renderAt(`/meal-prep/${CHICKEN_ID}`)

    const finish = await screen.findByRole('button', { name: 'Se terminó' })
    // What the refetch after saving brings back.
    setRpcDefault('my_meal_preps', {
      data: [row({ finished_at: '2026-10-28T15:00:00Z' })],
      error: null,
    })
    await userEvent.click(finish)
    expect(mock.from).toHaveBeenCalledWith('meal_preps')
    // The fake clock keeps moving, so only the day is fixed.
    expect(mock.query.update).toHaveBeenCalledWith({
      finished_at: expect.stringMatching(/^2026-10-28T15:00/),
    })
    expect(mock.query.eq).toHaveBeenCalledWith('id', CHICKEN_ID)

    await userEvent.click(await screen.findByRole('button', { name: 'Reactivar' }))
    expect(mock.query.update).toHaveBeenLastCalledWith({ finished_at: null })
  })

  it('cannot reactivate a batch that ran out', async () => {
    setRpcDefault('my_meal_preps', { data: [row({ logged_grams: 1300 })], error: null })
    renderAt(`/meal-prep/${CHICKEN_ID}`)
    expect(await screen.findByText('Terminado')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Se terminó' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reactivar' })).not.toBeInTheDocument()
  })

  it('offers to cook it again with the same ingredients (HU-19 CA3)', async () => {
    setRpcDefault('my_meal_preps', { data: [row()], error: null })
    renderAt(`/meal-prep/${CHICKEN_ID}`)
    await userEvent.click(await screen.findByRole('link', { name: 'Hacer de nuevo' }))
    expect(screen.getByText(`En /meal-prep/new?from=${CHICKEN_ID}`)).toBeInTheDocument()
  })

  it('deletes after confirming, saying the logs stay (HU-19 CA4)', async () => {
    setRpcDefault('my_meal_preps', { data: [row()], error: null })
    renderAt(`/meal-prep/${CHICKEN_ID}`)

    await userEvent.click(await screen.findByRole('button', { name: 'Eliminar meal prep' }))
    const sheet = screen.getByRole('dialog', { name: '¿Eliminar Pollo a la plancha?' })
    expect(sheet).toHaveTextContent('se queda en tus días')
    setRpcDefault('my_meal_preps', { data: [], error: null })
    await userEvent.click(within(sheet).getByRole('button', { name: 'Eliminar' }))

    expect(mock.query.delete).toHaveBeenCalled()
    expect(mock.query.eq).toHaveBeenCalledWith('id', CHICKEN_ID)
    expect(await screen.findByText('Aún no tienes meal prep')).toBeInTheDocument()
  })

  it('says so when the batch does not exist', async () => {
    setRpcDefault('my_meal_preps', { data: [], error: null })
    renderAt(`/meal-prep/${CHICKEN_ID}`)
    expect(await screen.findByText('No encontramos este meal prep')).toBeInTheDocument()
  })
})
