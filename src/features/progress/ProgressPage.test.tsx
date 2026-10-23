import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { localDate } from '@/domain/dates'
import { renderWithAuth, resetSupabaseMock, signedInSession } from '@/test/renderWithAuth'
import { supabase as mock, queueQueryResult, setTableDefault } from '@/test/supabaseMock'
import { ProgressPage } from './ProgressPage'

vi.mock('@/lib/supabase', () => import('@/test/supabaseMock'))

const today = () => localDate(new Date(), 'America/Santiago')

function renderPage() {
  return renderWithAuth([{ path: '/progress', element: <ProgressPage /> }], {
    path: '/progress',
    session: signedInSession,
  })
}

describe('ProgressPage', () => {
  beforeEach(() => resetSupabaseMock())

  it('shows the latest weight and is the Progreso tab', async () => {
    setTableDefault('weight_entries', {
      data: { date: '2026-10-20', weight_kg: 78.4 },
      error: null,
    })
    renderPage()
    expect(await screen.findByText('78,4')).toBeInTheDocument()
    expect(screen.getByText('Último registro: Mar 20 oct')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Progreso' })).toHaveAttribute('aria-current', 'page')
  })

  it('saves today’s weight as an upsert, with a decimal comma (HU-13 CA1)', async () => {
    setTableDefault('weight_entries', { data: null, error: null })
    renderPage()
    expect(await screen.findByText('Aún no registras tu peso.')).toBeInTheDocument()

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Registrar peso' }))
    await user.type(screen.getByLabelText('Peso de hoy (kg)'), '77,9')
    queueQueryResult('weight_entries', { data: null, error: null })
    setTableDefault('weight_entries', { data: { date: today(), weight_kg: 77.9 }, error: null })
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(mock.query.upsert).toHaveBeenCalledWith(
      { date: today(), weight_kg: 77.9 },
      { onConflict: 'user_id,date' },
    )
    expect(await screen.findByText('Guardamos 77,9 kg para hoy')).toBeInTheDocument()
    expect(await screen.findByText('Registrado hoy')).toBeInTheDocument()
  })

  it('warns that a second weight today replaces the first', async () => {
    setTableDefault('weight_entries', { data: { date: today(), weight_kg: 78 }, error: null })
    renderPage()
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Registrar peso' }))
    expect(screen.getByLabelText('Peso de hoy (kg)')).toHaveValue('78')
    expect(
      screen.getByText('Hoy ya registraste 78,0 kg. Si guardas otro, lo reemplaza.'),
    ).toBeInTheDocument()
  })

  it('rejects a weight outside 30–300 kg (HU-13 CA2)', async () => {
    setTableDefault('weight_entries', { data: null, error: null })
    renderPage()
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Registrar peso' }))
    await user.type(screen.getByLabelText('Peso de hoy (kg)'), '25')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByText('Ingresa un peso entre 30 y 300 kg')).toBeInTheDocument()
    expect(mock.query.upsert).not.toHaveBeenCalled()
  })

  it('keeps the sheet open with a message when the save fails', async () => {
    setTableDefault('weight_entries', { data: null, error: null })
    renderPage()
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Registrar peso' }))
    await user.type(screen.getByLabelText('Peso de hoy (kg)'), '70')
    queueQueryResult('weight_entries', { data: null, error: { message: 'offline' } })
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos guardar tu peso')
  })
})
