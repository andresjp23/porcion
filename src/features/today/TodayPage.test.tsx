import { fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithAuth, resetSupabaseMock, signedInSession } from '@/test/renderWithAuth'
import { supabase as mock, setTableDefault } from '@/test/supabaseMock'
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

    const breakfast = (await screen.findByRole('heading', { name: 'Desayuno' })).closest(
      'div',
    )!.parentElement!
    expect(within(breakfast).getByText('Marraqueta, Huevo')).toBeInTheDocument()
    expect(within(breakfast).getByText('420')).toBeInTheDocument()

    const lunch = screen.getByRole('heading', { name: 'Almuerzo' }).closest('div')!.parentElement!
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
})
