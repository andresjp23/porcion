import { fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithAuth, resetSupabaseMock, signedInSession } from '@/test/renderWithAuth'
import {
  supabase as mock,
  queueQueryResult,
  queueRpcResult,
  setTableDefault,
} from '@/test/supabaseMock'
import { TodayPage } from './TodayPage'

vi.mock('@/lib/supabase', () => import('@/test/supabaseMock'))

const profile = {
  id: 'user-1',
  timezone: 'America/Santiago',
  kcal_target: 2100,
  protein_g: 130,
  carbs_g: 235,
  fat_g: 70,
}

let nextId = 0
function log(meal: string, food_name: string, kcal: number, macros = [10, 20, 5]) {
  const [protein, carbs, fat] = macros
  nextId += 1
  return {
    id: `log-${nextId}`,
    food_id: `food-${food_name}`,
    meal_prep_id: null,
    meal,
    portion_id: null,
    quantity: 100,
    grams: 100,
    food_name,
    kcal,
    protein,
    carbs,
    fat,
    created_at: `2026-10-22T1${nextId % 10}:00:00Z`,
  }
}

function given(logs: unknown[]) {
  setTableDefault('profiles', { data: profile, error: null })
  setTableDefault('food_logs', { data: logs, error: null })
}

function renderToday(path = '/') {
  return renderWithAuth([{ path: '/', element: <TodayPage /> }], {
    path,
    session: signedInSession,
  })
}

describe('TodayPage', () => {
  beforeEach(() => {
    resetSupabaseMock()
    // Thursday 22 October 2026, noon in Santiago.
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-22T15:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows remaining, consumed and target kcal with the macros (HU-03 CA1)', async () => {
    given([
      log('breakfast', 'Marraqueta', 272, [10.8, 49.7, 2.4]),
      log('breakfast', 'Palta Hass', 915, [67.2, 78.3, 38.6]),
    ])
    renderToday()

    expect(await screen.findByRole('heading', { name: 'Hoy vas bien' })).toBeInTheDocument()
    expect(screen.getByText('Jue 22 oct')).toBeInTheDocument()
    expect(await screen.findByRole('img', { name: '1.187 de 2.100 kcal' })).toHaveTextContent(
      '913restantes',
    )
    expect(screen.getByText('Consumidas').nextElementSibling).toHaveTextContent('1.187 kcal')
    expect(screen.getByText('Meta diaria').nextElementSibling).toHaveTextContent('2.100 kcal')
    expect(screen.getByRole('progressbar', { name: 'Proteína' })).toHaveAttribute(
      'aria-valuetext',
      '78 de 130 g',
    )
    expect(mock.query.eq).toHaveBeenCalledWith('log_date', '2026-10-22')
  })

  it('lists the four meals with their total and foods (HU-03 CA2)', async () => {
    given([
      log('breakfast', 'Marraqueta', 272),
      log('breakfast', 'Huevo', 74),
      log('breakfast', 'Huevo', 74),
      log('snack', 'Plátano', 112),
    ])
    renderToday()

    const breakfast = await screen.findByRole('region', { name: 'Desayuno' })
    expect(within(breakfast).getByText('Marraqueta, Huevo')).toBeInTheDocument()
    expect(within(breakfast).getByText('420')).toBeInTheDocument()

    const lunch = screen.getByRole('region', { name: 'Almuerzo' })
    expect(within(lunch).getByText('Aún sin registros')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Agregar a Almuerzo' })).toHaveAttribute(
      'href',
      '/add?meal=lunch',
    )
  })

  it('says "sobre la meta" in a neutral tone past the target (HU-03 CA4, R-08)', async () => {
    given([log('lunch', 'Completo italiano', 2220)])
    renderToday()

    expect(await screen.findByRole('heading', { name: 'Así va tu día' })).toBeInTheDocument()
    expect(await screen.findByRole('img', { name: '2.220 de 2.100 kcal' })).toHaveTextContent(
      '120sobre la meta',
    )
  })

  it('moves to another day and back (HU-03 CA3)', async () => {
    given([])
    const router = renderToday()
    expect(await screen.findByRole('button', { name: 'Día siguiente' })).toBeDisabled()

    await userEvent.click(screen.getByRole('button', { name: 'Día anterior' }))
    expect(router.state.location.search).toBe('?date=2026-10-21')
    expect(await screen.findByRole('heading', { name: 'Ayer' })).toBeInTheDocument()
    expect(mock.query.eq).toHaveBeenCalledWith('log_date', '2026-10-21')
    // Adding from yesterday logs to yesterday.
    expect(screen.getByRole('link', { name: 'Agregar a Cena' })).toHaveAttribute(
      'href',
      '/add?meal=dinner&date=2026-10-21',
    )

    await userEvent.click(screen.getByRole('link', { name: 'Volver a hoy' }))
    expect(await screen.findByRole('heading', { name: 'Hoy vas bien' })).toBeInTheDocument()
  })

  it('picks any past date', async () => {
    given([])
    const router = renderToday()
    const picker = await screen.findByLabelText('Elegir día')
    expect(picker).toHaveAttribute('max', '2026-10-22')

    // userEvent cannot type into a date input in jsdom.
    fireEvent.change(picker, { target: { value: '2026-10-01' } })
    expect(router.state.location.search).toBe('?date=2026-10-01')
    expect(await screen.findByRole('heading', { name: 'Tu día' })).toBeInTheDocument()
  })

  it('treats a future or invalid date as today', async () => {
    given([])
    renderToday('/?date=2026-12-24')
    expect(await screen.findByRole('heading', { name: 'Hoy vas bien' })).toBeInTheDocument()
    expect(mock.query.eq).toHaveBeenCalledWith('log_date', '2026-10-22')
  })

  it('offers to retry when the day does not load', async () => {
    setTableDefault('profiles', { data: profile, error: null })
    setTableDefault('food_logs', { data: null, error: new Error('offline') })
    renderToday()
    expect(await screen.findByText('No pudimos cargar tu día')).toBeInTheDocument()
  })

  describe('editing a log (HU-06)', () => {
    const BREAD_ID = '551897d8-7b1e-5943-a2d6-a00e6b49df1b'
    const breadLog = {
      ...log('breakfast', 'Marraqueta', 272, [10.75, 49.68, 2.42]),
      id: 'log-bread',
      food_id: BREAD_ID,
      portion_id: 'whole',
      quantity: 1,
      grams: 100,
    }
    const bread = {
      id: BREAD_ID,
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
        { id: 'whole', name: '1 marraqueta', grams: 100, is_default: true },
        { id: 'half', name: '1/2 marraqueta', grams: 50, is_default: false },
      ],
    }

    async function openBread() {
      given([breadLog])
      setTableDefault('foods', { data: bread, error: null })
      renderToday()
      const breakfast = await screen.findByRole('region', { name: 'Desayuno' })
      await userEvent.click(within(breakfast).getByRole('button', { expanded: false }))
      await userEvent.click(
        within(breakfast).getByRole('button', { name: /^Marraqueta.*272 kcal$/ }),
      )
      return screen.findByRole('dialog', { name: 'Marraqueta' })
    }

    it('opens a sheet with the amount and the meal (CA1)', async () => {
      const sheet = await openBread()
      expect(await within(sheet).findByText(/1 marraqueta · 100 g/)).toBeInTheDocument()
      expect(within(sheet).getByRole('button', { name: 'Desayuno' })).toHaveAttribute(
        'aria-pressed',
        'true',
      )
    })

    it('saves a new amount and meal from the log’s own snapshot (R-02)', async () => {
      const sheet = await openBread()
      await userEvent.click(
        await within(sheet).findByRole('button', { name: '1/2 marraqueta (50 g)' }),
      )
      await userEvent.click(within(sheet).getByRole('button', { name: 'Sumar 0,5' }))
      await userEvent.click(within(sheet).getByRole('button', { name: 'Colación' }))
      await userEvent.click(within(sheet).getByRole('button', { name: 'Guardar' }))

      expect(mock.query.update).toHaveBeenCalledWith({
        meal: 'snack',
        portion_id: 'half',
        quantity: 1.5,
        grams: 75,
        kcal: 204,
        protein: 8.0625,
        carbs: 37.26,
        fat: 1.815,
      })
      expect(mock.query.eq).toHaveBeenCalledWith('id', 'log-bread')
      await vi.waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    })

    it('deletes, and Deshacer puts the log back as it was (CA2)', async () => {
      const sheet = await openBread()
      await userEvent.click(await within(sheet).findByRole('button', { name: 'Eliminar' }))

      expect(mock.query.delete).toHaveBeenCalled()
      expect(mock.query.eq).toHaveBeenCalledWith('id', 'log-bread')
      const toast = screen.getByRole('status')
      expect(toast).toHaveTextContent('Eliminaste Marraqueta')

      await userEvent.click(within(toast).getByRole('button', { name: 'Deshacer' }))
      expect(mock.query.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'log-bread',
          created_at: breadLog.created_at,
          food_id: BREAD_ID,
          portion_id: 'whole',
          quantity: 1,
          kcal: 272,
        }),
      )
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
    })

    it('edits in grams a log whose food no longer exists', async () => {
      given([{ ...breadLog, food_id: null, portion_id: null, quantity: 100 }])
      renderToday()
      const breakfast = await screen.findByRole('region', { name: 'Desayuno' })
      await userEvent.click(within(breakfast).getByRole('button', { expanded: false }))
      await userEvent.click(within(breakfast).getByRole('button', { name: /^Marraqueta/ }))
      const sheet = await screen.findByRole('dialog', { name: 'Marraqueta' })
      expect(within(sheet).getByLabelText('Gramos')).toHaveValue('100')
      expect(within(sheet).queryByRole('group', { name: 'Porción' })).not.toBeInTheDocument()
    })

    it('edits a meal prep serving in cooked grams, and Deshacer keeps its batch (HU-18 CA3)', async () => {
      given([
        {
          ...log('lunch', 'Pollo a la plancha', 222, [46, 0, 4.4]),
          id: 'log-prep',
          food_id: null,
          meal_prep_id: 'prep-1',
          quantity: 150,
          grams: 150,
        },
      ])
      renderToday()
      const lunch = await screen.findByRole('region', { name: 'Almuerzo' })
      await userEvent.click(within(lunch).getByRole('button', { expanded: false }))
      await userEvent.click(within(lunch).getByRole('button', { name: /^Pollo a la plancha/ }))
      const sheet = await screen.findByRole('dialog', { name: 'Pollo a la plancha' })
      expect(within(sheet).getByLabelText('Gramos')).toHaveValue('150')

      await userEvent.click(within(sheet).getByRole('button', { name: 'Eliminar' }))
      await userEvent.click(
        within(screen.getByRole('status')).getByRole('button', { name: 'Deshacer' }),
      )
      expect(mock.query.insert).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'log-prep', meal_prep_id: 'prep-1', grams: 150 }),
      )
    })
  })

  describe('repeating yesterday (HU-07)', () => {
    const yesterdayBreakfast = [
      log('breakfast', 'Marraqueta', 272),
      log('breakfast', 'Palta Hass', 67),
    ]

    function givenDays(today: unknown[], yesterday: unknown[]) {
      setTableDefault('profiles', { data: profile, error: null })
      // Hoy asks for today first, then for yesterday.
      queueQueryResult('food_logs', { data: today, error: null }, { data: yesterday, error: null })
      setTableDefault('food_logs', { data: today, error: null })
    }

    it('offers to repeat an empty meal that yesterday had (CA1)', async () => {
      givenDays([log('lunch', 'Arroz', 205)], yesterdayBreakfast)
      queueRpcResult('copy_meal', { data: 2, error: null })
      renderToday()

      const breakfast = await screen.findByRole('region', { name: 'Desayuno' })
      const repeat = await within(breakfast).findByRole('button', { name: 'Repetir ayer' })
      expect(repeat).toHaveAccessibleDescription('339 kcal · Marraqueta, Palta Hass')
      // Lunch has logs and dinner had nothing yesterday.
      expect(screen.getAllByRole('button', { name: 'Repetir ayer' })).toHaveLength(1)

      await userEvent.click(repeat)
      expect(mock.rpc).toHaveBeenCalledWith('copy_meal', {
        from_date: '2026-10-21',
        to_date: '2026-10-22',
        m: 'breakfast',
      })
    })

    it('is only offered for today', async () => {
      givenDays([], yesterdayBreakfast)
      renderToday('/?date=2026-10-21')
      await screen.findByRole('heading', { name: 'Ayer' })
      expect(screen.queryByRole('button', { name: 'Repetir ayer' })).not.toBeInTheDocument()
    })
  })

  describe('the first day (L-6)', () => {
    function givenNeverLogged(hasLogged: boolean) {
      setTableDefault('profiles', { data: profile, error: null })
      // Hoy asks for today, yesterday and whether anything was ever logged.
      queueQueryResult(
        'food_logs',
        { data: [], error: null },
        { data: [], error: null },
        { data: hasLogged ? { id: 'log-old' } : null, error: null },
      )
      setTableDefault('food_logs', { data: [], error: null })
    }

    it('welcomes someone who has never logged anything', async () => {
      givenNeverLogged(false)
      renderToday()
      expect(
        await screen.findByRole('heading', { name: '¡Te damos la bienvenida!' }),
      ).toBeInTheDocument()
      expect(screen.getByText(/Créalo con los datos de su etiqueta/)).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Agregar tu primera comida' })).toHaveAttribute(
        'href',
        '/add',
      )
      expect(screen.getByRole('link', { name: 'Crear un alimento' })).toHaveAttribute(
        'href',
        '/foods/new',
      )
    })

    it('does not welcome again someone who already logged on another day', async () => {
      givenNeverLogged(true)
      renderToday()
      await screen.findByRole('region', { name: 'Desayuno' })
      await vi.waitFor(() =>
        expect(vi.mocked(mock.from).mock.calls.filter(([t]) => t === 'food_logs')).toHaveLength(3),
      )
      expect(
        screen.queryByRole('heading', { name: '¡Te damos la bienvenida!' }),
      ).not.toBeInTheDocument()
    })
  })
})
