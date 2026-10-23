import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { addDays, localDate } from '@/domain/dates'
import { formatDay } from '@/lib/format'
import { renderWithAuth, resetSupabaseMock, signedInSession } from '@/test/renderWithAuth'
import { supabase as mock, queueQueryResult, setTableDefault } from '@/test/supabaseMock'
import { ProgressPage } from './ProgressPage'

vi.mock('@/lib/supabase', () => import('@/test/supabaseMock'))

const today = () => localDate(new Date(), 'America/Santiago')
const daysAgo = (n: number) => addDays(today(), -n)

function renderPage() {
  return renderWithAuth([{ path: '/progress', element: <ProgressPage /> }], {
    path: '/progress',
    session: signedInSession,
  })
}

function givenWeights(...weights: [daysAgo: number, kg: number][]) {
  setTableDefault('weight_entries', {
    data: weights.map(([n, kg]) => ({ date: daysAgo(n), weight_kg: kg })),
    error: null,
  })
}

describe('ProgressPage', () => {
  beforeEach(() => {
    resetSupabaseMock()
    setTableDefault('food_logs', { data: [], error: null })
  })

  describe('weight', () => {
    it('shows the trend and its change in the month (HU-14 CA2)', async () => {
      givenWeights([20, 80], [10, 79], [0, 78])
      renderPage()
      // 80 → 79.9 → 79.71
      expect(await screen.findByText('79,7')).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'Peso (tendencia)' })).toBeInTheDocument()
      expect(screen.getByText('−0,3 kg en 30 días')).toBeInTheDocument()
      const table = screen.getByRole('table', { name: 'Peso diario y tendencia' })
      expect(within(table).getAllByRole('row')).toHaveLength(4)
      expect(screen.getByRole('link', { name: 'Progreso' })).toHaveAttribute('aria-current', 'page')
    })

    it('invites to log more with fewer than 3 weights in the period (HU-14 CA4)', async () => {
      givenWeights([20, 80], [10, 79], [0, 78])
      renderPage()
      await screen.findByText('79,7')
      await userEvent.click(screen.getByRole('button', { name: 'Semana' }))

      expect(
        screen.getByText('Te faltan 2 registros en este período para ver tu tendencia.'),
      ).toBeInTheDocument()
      expect(screen.getByText('78,0')).toBeInTheDocument()
      expect(screen.getByText('Registrado hoy')).toBeInTheDocument()
    })

    it('invites to log the first weight when there is none', async () => {
      givenWeights()
      renderPage()
      expect(await screen.findByText('Aún no registras tu peso.')).toBeInTheDocument()
      expect(
        screen.getByText('Registra tu peso al menos 3 días en este período para ver tu tendencia.'),
      ).toBeInTheDocument()
    })
  })

  describe('Registrar peso', () => {
    it('saves today’s weight as an upsert, with a decimal comma (HU-13 CA1)', async () => {
      givenWeights([3, 78.4])
      renderPage()
      expect(await screen.findByText(`Último registro: ${formatDay(daysAgo(3))}`)).toBeVisible()

      const user = userEvent.setup()
      await user.click(screen.getByRole('button', { name: 'Registrar peso' }))
      const field = screen.getByLabelText('Peso de hoy (kg)')
      expect(field).toHaveValue('78,4')
      await user.clear(field)
      await user.type(field, '77,9')
      queueQueryResult('weight_entries', { data: null, error: null })
      givenWeights([3, 78.4], [0, 77.9])
      await user.click(screen.getByRole('button', { name: 'Guardar' }))

      expect(mock.query.upsert).toHaveBeenCalledWith(
        { date: today(), weight_kg: 77.9 },
        { onConflict: 'user_id,date' },
      )
      expect(await screen.findByText('Guardamos 77,9 kg para hoy')).toBeInTheDocument()
      expect(await screen.findByText('Registrado hoy')).toBeInTheDocument()
    })

    it('warns that a second weight today replaces the first', async () => {
      givenWeights([0, 78])
      renderPage()
      const user = userEvent.setup()
      await screen.findByText('Registrado hoy')
      await user.click(screen.getByRole('button', { name: 'Registrar peso' }))
      expect(screen.getByLabelText('Peso de hoy (kg)')).toHaveValue('78')
      expect(
        screen.getByText('Hoy ya registraste 78,0 kg. Si guardas otro, lo reemplaza.'),
      ).toBeInTheDocument()
    })

    it('rejects a weight outside 30–300 kg (HU-13 CA2)', async () => {
      givenWeights()
      renderPage()
      const user = userEvent.setup()
      await user.click(await screen.findByRole('button', { name: 'Registrar peso' }))
      await user.type(screen.getByLabelText('Peso de hoy (kg)'), '25')
      await user.click(screen.getByRole('button', { name: 'Guardar' }))

      expect(await screen.findByText('Ingresa un peso entre 30 y 300 kg')).toBeInTheDocument()
      expect(mock.query.upsert).not.toHaveBeenCalled()
    })

    it('keeps the sheet open with a message when the save fails', async () => {
      givenWeights()
      renderPage()
      const user = userEvent.setup()
      await user.click(await screen.findByRole('button', { name: 'Registrar peso' }))
      await user.type(screen.getByLabelText('Peso de hoy (kg)'), '70')
      queueQueryResult('weight_entries', { data: null, error: { message: 'offline' } })
      await user.click(screen.getByRole('button', { name: 'Guardar' }))

      expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos guardar tu peso')
    })
  })

  describe('calories of the week', () => {
    it('averages the days with logs and lists each day (HU-14 CA3)', async () => {
      givenWeights()
      setTableDefault('food_logs', {
        data: [
          { log_date: daysAgo(1), kcal: 1500 },
          { log_date: daysAgo(1), kcal: 500 },
          { log_date: today(), kcal: 2200 },
        ],
        error: null,
      })
      renderPage()
      expect(await screen.findByText('Promedio 2.100')).toBeInTheDocument()
      const table = screen.getByRole('table', { name: 'Calorías de los últimos 7 días' })
      expect(within(table).getAllByText('Sin registros')).toHaveLength(5)
      expect(within(table).getByText('2.000 kcal')).toBeInTheDocument()
      expect(mock.query.gte).toHaveBeenCalledWith('log_date', daysAgo(6))
      expect(mock.query.lte).toHaveBeenCalledWith('log_date', today())
    })

    it('says so when nothing was logged this week', async () => {
      givenWeights()
      renderPage()
      expect(await screen.findByText('Aún no registras comidas esta semana.')).toBeInTheDocument()
    })
  })
})
