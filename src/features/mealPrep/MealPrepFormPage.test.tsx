import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useLocation } from 'react-router'
import { renderWithAuth, resetSupabaseMock, signedInSession } from '@/test/renderWithAuth'
import {
  supabase as mock,
  queueRpcResult,
  setRpcDefault,
  setTableDefault,
} from '@/test/supabaseMock'
import { EditMealPrepPage, NewMealPrepPage } from './MealPrepFormPage'

vi.mock('@/lib/supabase', () => import('@/test/supabaseMock'))

const PREP_ID = '5a1d2c3b-4e5f-4a6b-8c7d-9e0f1a2b3c4d'

const food = (id: string, name: string, kcal: number, protein: number, fat: number) => ({
  id,
  name,
  brand: null,
  basis: 'g',
  kcal_100: kcal,
  protein_100: protein,
  carbs_100: 0,
  fat_100: fat,
  source: 'seed',
  verified: true,
  open_reports: 0,
  default_portion_id: null,
  default_portion_name: null,
  default_portion_grams: null,
})

function Where() {
  const location = useLocation()
  return <p>En {location.pathname + location.search}</p>
}

const chicken = food('food-chicken', 'Pechuga de pollo cruda', 110, 23, 1.5)
const oil = food('food-oil', 'Aceite vegetal', 884, 0, 100)

function renderPage(path: string) {
  return renderWithAuth(
    [
      { path: '/meal-prep/new', element: <NewMealPrepPage /> },
      { path: '/meal-prep/:id/edit', element: <EditMealPrepPage /> },
      { path: '/meal-prep/:id', element: <p>Detalle del meal prep</p> },
      { path: '/scan', element: <Where /> },
    ],
    { path, session: signedInSession },
  )
}

async function addIngredient(search: string, name: string, grams: string) {
  await userEvent.click(screen.getByRole('button', { name: 'Agregar ingrediente' }))
  const sheet = screen.getByRole('dialog', { name: 'Agregar ingrediente' })
  await userEvent.type(within(sheet).getByLabelText('Buscar ingrediente'), search)
  await userEvent.click(await within(sheet).findByRole('button', { name: new RegExp(name) }))
  await userEvent.type(screen.getByLabelText(`Gramos de ${name}`), grams)
}

const saveCalls = () => vi.mocked(mock.rpc).mock.calls.filter(([fn]) => fn === 'save_meal_prep')

describe('NewMealPrepPage', () => {
  beforeEach(() => {
    resetSupabaseMock()
    vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-26T15:00:00Z'))
    setRpcDefault('recent_foods', { data: [], error: null })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('saves the raw ingredients and the cooked weight, cooked today (HU-17)', async () => {
    queueRpcResult('search_foods', { data: [chicken], error: null }, { data: [oil], error: null })
    queueRpcResult('save_meal_prep', { data: PREP_ID, error: null })
    renderPage('/meal-prep/new')

    await userEvent.type(screen.getByLabelText('Nombre'), 'Pollo a la plancha')
    await addIngredient('pechuga', 'Pechuga de pollo cruda', '1700')
    await addIngredient('aceite', 'Aceite vegetal', '3')
    await userEvent.type(screen.getByLabelText('Peso cocido (g)'), '1275')
    await userEvent.type(screen.getByLabelText('Porciones'), '5')

    // CA5: 1,896.5 kcal over 1,275 g cooked, and 5 servings of 255 g.
    const summary = screen.getByRole('region', { name: 'Resumen' })
    expect(within(summary).getByText('Todo el lote').nextSibling).toHaveTextContent('1.897 kcal')
    expect(within(summary).getByText('Por 100 g cocidos').nextSibling).toHaveTextContent(
      '149 kcalP 30,7',
    )
    expect(within(summary).getByText('Por porción (255 g)').nextSibling).toHaveTextContent(
      '379 kcal',
    )

    await userEvent.click(screen.getByRole('button', { name: 'Guardar meal prep' }))
    expect(await screen.findByText('Detalle del meal prep')).toBeInTheDocument()
    expect(saveCalls()).toEqual([
      [
        'save_meal_prep',
        {
          prep_id: null,
          name: 'Pollo a la plancha',
          cooked_on: '2026-10-26',
          cooked_grams: 1275,
          servings: 5,
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
            {
              food_id: 'food-oil',
              food_name: 'Aceite vegetal',
              grams: 3,
              kcal_100: 884,
              protein_100: 0,
              carbs_100: 0,
              fat_100: 100,
            },
          ],
        },
      ],
    ])
  })

  it('falls back to the raw weight and says so, without blocking (HU-17 CA3)', async () => {
    queueRpcResult('search_foods', { data: [chicken], error: null })
    queueRpcResult('save_meal_prep', { data: PREP_ID, error: null })
    renderPage('/meal-prep/new')

    await userEvent.type(screen.getByLabelText('Nombre'), 'Pollo')
    await addIngredient('pechuga', 'Pechuga de pollo cruda', '500')

    expect(screen.getByText(/Sin peso cocido usamos el peso crudo \(500 g\)/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Guardar meal prep' }))
    expect(await screen.findByText('Detalle del meal prep')).toBeInTheDocument()
    expect(saveCalls()[0]?.[1]).toMatchObject({ cooked_grams: null, servings: null })
  })

  it('warns when the cooked weight looks like it includes the container', async () => {
    queueRpcResult('search_foods', { data: [chicken], error: null })
    renderPage('/meal-prep/new')

    await addIngredient('pechuga', 'Pechuga de pollo cruda', '500')
    await userEvent.type(screen.getByLabelText('Peso cocido (g)'), '1600')
    expect(screen.getByText(/¿Taraste la pesa con el recipiente\?/)).toBeInTheDocument()
  })

  it('needs at least one ingredient', async () => {
    renderPage('/meal-prep/new')
    await userEvent.type(screen.getByLabelText('Nombre'), 'Nada')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar meal prep' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Agrega al menos un ingrediente')
    expect(saveCalls()).toEqual([])
  })

  it('removes an ingredient', async () => {
    queueRpcResult('search_foods', { data: [chicken], error: null })
    renderPage('/meal-prep/new')
    await addIngredient('pechuga', 'Pechuga de pollo cruda', '500')
    await userEvent.click(screen.getByRole('button', { name: 'Quitar Pechuga de pollo cruda' }))
    expect(screen.queryByLabelText('Gramos de Pechuga de pollo cruda')).not.toBeInTheDocument()
  })

  it('keeps what was typed when saving fails', async () => {
    queueRpcResult('search_foods', { data: [chicken], error: null })
    queueRpcResult('save_meal_prep', { data: null, error: { message: 'offline' } })
    renderPage('/meal-prep/new')
    await userEvent.type(screen.getByLabelText('Nombre'), 'Pollo')
    await addIngredient('pechuga', 'Pechuga de pollo cruda', '500')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar meal prep' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos guardar tu meal prep')
    expect(screen.getByLabelText('Nombre')).toHaveValue('Pollo')
  })
})

describe('scanning an ingredient (MP-3b)', () => {
  const TRAY_ID = '33333333-3333-4333-8333-333333333333'

  beforeEach(() => {
    resetSupabaseMock()
    sessionStorage.clear()
    setRpcDefault('recent_foods', { data: [], error: null })
  })

  it('keeps what was typed while scanning, and adds the scanned food', async () => {
    renderPage('/meal-prep/new')
    await userEvent.type(screen.getByLabelText('Nombre'), 'Pollo para la semana')
    await userEvent.type(screen.getByLabelText('Porciones'), '5')
    await userEvent.click(screen.getByRole('button', { name: 'Escanear ingrediente' }))
    expect(await screen.findByText('En /scan?return=%2Fmeal-prep%2Fnew')).toBeInTheDocument()
  })

  it('comes back with the draft and the food, ready for its grams', async () => {
    sessionStorage.setItem(
      'porcion-meal-prep-draft:/meal-prep/new',
      JSON.stringify({
        name: 'Pollo para la semana',
        ingredients: [],
        cookedGrams: '',
        servings: '5',
      }),
    )
    setTableDefault('foods', {
      data: {
        id: TRAY_ID,
        name: 'Pechuga deshuesada',
        brand: 'Super Pollo',
        basis: 'g',
        kcal_100: 106,
        protein_100: 22.5,
        carbs_100: 0,
        fat_100: 1.8,
        source: 'off',
        verified: false,
        open_reports: 0,
        barcode: '7801234567894',
        food_portions: [],
      },
      error: null,
    })
    renderPage(`/meal-prep/new?resume=1&ingredient=${TRAY_ID}`)

    const grams = await screen.findByLabelText('Gramos de Pechuga deshuesada · Super Pollo')
    // Focus moves on the next frame.
    await vi.waitFor(() => expect(grams).toHaveFocus())
    expect(screen.getByLabelText('Nombre')).toHaveValue('Pollo para la semana')
    expect(screen.getByLabelText('Porciones')).toHaveValue('5')
  })
})

describe('Hacer de nuevo (HU-19 CA3)', () => {
  beforeEach(() => {
    resetSupabaseMock()
    setRpcDefault('recent_foods', { data: [], error: null })
  })

  it('copies the name, ingredients and servings, and asks for the cooked weight again', async () => {
    setRpcDefault('my_meal_preps', {
      data: [
        {
          id: PREP_ID,
          name: 'Arroz',
          cooked_on: '2026-10-20',
          cooked_grams: 600,
          servings: 4,
          finished_at: '2026-10-23T12:00:00Z',
          created_at: '2026-10-20T20:00:00Z',
          logged_grams: 450,
          ingredients: [
            {
              food_id: null,
              food_name: 'Arroz crudo',
              grams: 200,
              kcal_100: 360,
              protein_100: 6.6,
              carbs_100: 79,
              fat_100: 0.6,
            },
          ],
        },
      ],
      error: null,
    })
    queueRpcResult('save_meal_prep', { data: 'new-id', error: null })
    renderPage(`/meal-prep/new?from=${PREP_ID}`)

    expect(await screen.findByLabelText('Nombre')).toHaveValue('Arroz')
    expect(screen.getByLabelText('Gramos de Arroz crudo')).toHaveValue('200')
    expect(screen.getByLabelText('Porciones')).toHaveValue('4')
    expect(screen.getByLabelText('Peso cocido (g)')).toHaveValue('')

    await userEvent.click(screen.getByRole('button', { name: 'Guardar meal prep' }))
    expect(await screen.findByText('Detalle del meal prep')).toBeInTheDocument()
    expect(saveCalls()[0]?.[1]).toMatchObject({ prep_id: null, name: 'Arroz', servings: 4 })
  })
})

describe('EditMealPrepPage', () => {
  beforeEach(() => {
    resetSupabaseMock()
  })

  it('loads the batch and saves it with its id and cooking day (HU-17 CA6)', async () => {
    setRpcDefault('my_meal_preps', {
      data: [
        {
          id: PREP_ID,
          name: 'Arroz',
          cooked_on: '2026-10-24',
          cooked_grams: 600,
          servings: null,
          finished_at: null,
          created_at: '2026-10-24T20:00:00Z',
          logged_grams: 180,
          ingredients: [
            {
              food_id: null,
              food_name: 'Arroz crudo',
              grams: 200,
              kcal_100: 360,
              protein_100: 6.6,
              carbs_100: 79,
              fat_100: 0.6,
            },
          ],
        },
      ],
      error: null,
    })
    queueRpcResult('save_meal_prep', { data: PREP_ID, error: null })
    renderPage(`/meal-prep/${PREP_ID}/edit`)

    const cooked = await screen.findByLabelText('Peso cocido (g)')
    expect(cooked).toHaveValue('600')
    expect(screen.getByLabelText('Gramos de Arroz crudo')).toHaveValue('200')
    await userEvent.clear(cooked)
    await userEvent.type(cooked, '620')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(await screen.findByText('Detalle del meal prep')).toBeInTheDocument()
    expect(saveCalls()[0]?.[1]).toMatchObject({
      prep_id: PREP_ID,
      cooked_on: '2026-10-24',
      cooked_grams: 620,
    })
  })

  it('reads back grams without the thousands dot, which would parse as decimals', async () => {
    setRpcDefault('my_meal_preps', {
      data: [
        {
          id: PREP_ID,
          name: 'Porotos para el mes',
          cooked_on: '2026-10-24',
          cooked_grams: 12500.5,
          servings: null,
          finished_at: null,
          created_at: '2026-10-24T20:00:00Z',
          logged_grams: 0,
          ingredients: [
            {
              food_id: null,
              food_name: 'Porotos secos',
              grams: 5000,
              kcal_100: 340,
              protein_100: 21,
              carbs_100: 60,
              fat_100: 1,
            },
          ],
        },
      ],
      error: null,
    })
    renderPage(`/meal-prep/${PREP_ID}/edit`)
    expect(await screen.findByLabelText('Peso cocido (g)')).toHaveValue('12500,5')
    expect(screen.getByLabelText('Gramos de Porotos secos')).toHaveValue('5000')
  })

  it('says so when the batch does not exist', async () => {
    setRpcDefault('my_meal_preps', { data: [], error: null })
    renderPage(`/meal-prep/${PREP_ID}/edit`)
    expect(await screen.findByText('No encontramos este meal prep')).toBeInTheDocument()
  })
})
