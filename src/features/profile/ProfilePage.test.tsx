import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Tables } from '@/lib/database.types'
import { renderWithAuth, resetSupabaseMock, signedInSession } from '@/test/renderWithAuth'
import { supabase as mock, queueQueryResult, setTableDefault } from '@/test/supabaseMock'
import { ProfileDataPage } from './ProfileDataPage'
import { ProfilePage } from './ProfilePage'

vi.mock('@/lib/supabase', () => import('@/test/supabaseMock'))

// Man, 30 years old on 2026-10-22, 178 cm, 80 kg, moderate activity, losing weight:
// 2240 kcal suggested, with 128 g / 264 g / 75 g.
const base: Tables<'profiles'> = {
  id: 'user-1',
  display_name: null,
  sex: 'male',
  birth_date: '1996-05-15',
  height_cm: 178,
  activity: 'moderate',
  goal: 'lose',
  kcal_target: 2240,
  protein_g: 128,
  carbs_g: 264,
  fat_g: 75,
  kcal_is_manual: false,
  macros_are_manual: false,
  timezone: 'America/Santiago',
  privacy_version: '2026-10',
  privacy_accepted_at: '2026-10-22T12:00:00Z',
  onboarding_completed_at: '2026-10-22T12:00:00Z',
  created_at: '2026-10-22T12:00:00Z',
}

function renderProfile(
  profile: Partial<Tables<'profiles'>> = {},
  weightKg = 80,
  path = '/profile',
) {
  setTableDefault('profiles', { data: { ...base, ...profile }, error: null })
  setTableDefault('weight_entries', {
    data: { date: '2026-10-22', weight_kg: weightKg },
    error: null,
  })
  return renderWithAuth(
    [
      { path: '/profile', element: <ProfilePage /> },
      { path: '/profile/data', element: <ProfileDataPage /> },
    ],
    { path, session: signedInSession },
  )
}

/** Queued after loading, so the initial profile read does not take it. */
const queueSaved = () => queueQueryResult('profiles', { data: [{ id: 'user-1' }], error: null })

describe('ProfilePage', () => {
  beforeEach(() => {
    resetSupabaseMock()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-22T15:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows the target, the macros and the data it comes from', async () => {
    renderProfile()
    expect(await screen.findByText('Tu meta diaria (sugerida)')).toBeInTheDocument()
    expect(screen.getByText('2.240')).toBeInTheDocument()
    expect(screen.getByText('128 g')).toBeInTheDocument()
    expect(screen.getByText('30 años')).toBeInTheDocument()
    expect(screen.getByText('178 cm')).toBeInTheDocument()
    expect(screen.getByText('Moderado')).toBeInTheDocument()
    expect(screen.getByText('Bajar de peso')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /80,0 kg/ })).toHaveAttribute('href', '/progress')
    expect(screen.getByRole('link', { name: 'Perfil' })).toHaveAttribute('aria-current', 'page')
    expect(screen.queryByRole('button', { name: 'Recalcular mi meta' })).not.toBeInTheDocument()
  })

  it('offers the suggestion for a manual target and goes back to it (HU-15 CA2)', async () => {
    renderProfile({
      kcal_target: 1800,
      protein_g: 128,
      carbs_g: 154,
      fat_g: 60,
      kcal_is_manual: true,
    })
    expect(await screen.findByText('Tu meta diaria (a mano)')).toBeInTheDocument()
    expect(
      screen.getByText('Fijaste tu meta a mano. Con tus datos, la sugerida es 2.240 kcal.'),
    ).toBeInTheDocument()

    queueSaved()
    await userEvent.click(screen.getByRole('button', { name: 'Usar 2.240 kcal' }))
    expect(mock.query.update).toHaveBeenCalledWith({
      kcal_target: 2240,
      protein_g: 128,
      carbs_g: 264,
      fat_g: 75,
      kcal_is_manual: false,
      macros_are_manual: false,
    })
    expect(await screen.findByText('Volviste a la meta sugerida')).toBeInTheDocument()
  })

  it('offers the suggested macros for manual ones, on the current target', async () => {
    renderProfile({ protein_g: 150, carbs_g: 230, fat_g: 77, macros_are_manual: true })
    expect(await screen.findByText('Tus macros (a mano)')).toBeInTheDocument()
    queueSaved()
    await userEvent.click(screen.getByRole('button', { name: 'Usar los macros sugeridos' }))
    expect(mock.query.update).toHaveBeenCalledWith(
      expect.objectContaining({
        protein_g: 128,
        carbs_g: 264,
        fat_g: 75,
        macros_are_manual: false,
      }),
    )
  })

  it('recalculates what is not set by hand when the data changed (R-13)', async () => {
    // A new weight: 78 kg gives 1747.5 × 1.55 − 500 → 2210 kcal; the manual macros stay.
    renderProfile({ protein_g: 150, carbs_g: 230, fat_g: 77, macros_are_manual: true }, 78)
    const recalculate = await screen.findByRole('button', { name: 'Recalcular mi meta' })
    queueSaved()
    await userEvent.click(recalculate)
    expect(mock.query.update).toHaveBeenCalledWith({
      kcal_target: 2210,
      protein_g: 150,
      carbs_g: 230,
      fat_g: 77,
      kcal_is_manual: false,
      macros_are_manual: true,
    })
  })

  it('saves a target adjusted by hand as manual', async () => {
    renderProfile()
    await userEvent.click(await screen.findByRole('button', { name: 'Ajustar manualmente' }))
    const sheet = within(await screen.findByRole('dialog', { name: 'Ajustar mi meta' }))
    const kcal = sheet.getByLabelText('Meta diaria (kcal)')
    await userEvent.clear(kcal)
    await userEvent.type(kcal, '2000')
    queueSaved()
    await userEvent.click(sheet.getByRole('button', { name: 'Guardar' }))
    expect(mock.query.update).toHaveBeenCalledWith(
      expect.objectContaining({
        kcal_target: 2000,
        kcal_is_manual: true,
        macros_are_manual: false,
      }),
    )
  })

  it('keeps the target and shows why when saving fails', async () => {
    renderProfile({ kcal_target: 1800, kcal_is_manual: true })
    const button = await screen.findByRole('button', { name: 'Usar 2.240 kcal' })
    queueQueryResult('profiles', { data: null, error: { message: 'offline' } })
    await userEvent.click(button)
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos guardar tu meta')
  })

  it('signs out', async () => {
    renderProfile()
    await userEvent.click(await screen.findByRole('button', { name: 'Cerrar sesión' }))
    expect(mock.auth.signOut).toHaveBeenCalled()
  })
})

describe('ProfileDataPage', () => {
  beforeEach(() => {
    resetSupabaseMock()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-22T15:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('saves the data and recalculates the target (HU-15 CA1)', async () => {
    renderProfile({}, 80, '/profile/data')
    await userEvent.click(await screen.findByRole('radio', { name: /Mantener mi peso/ }))
    queueSaved()
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    // 1767.5 × 1.55 = 2739.6 → 2740 kcal
    expect(mock.query.update).toHaveBeenCalledWith(
      expect.objectContaining({
        goal: 'maintain',
        height_cm: 178,
        kcal_target: 2740,
        protein_g: 128,
        kcal_is_manual: false,
      }),
    )
    expect(await screen.findByText('Tu meta diaria (sugerida)')).toBeInTheDocument()
  })

  it('keeps a manual target when the data changes (R-13)', async () => {
    renderProfile(
      { kcal_target: 1800, carbs_g: 154, fat_g: 60, kcal_is_manual: true },
      80,
      '/profile/data',
    )
    await userEvent.click(await screen.findByRole('radio', { name: /Mantener mi peso/ }))
    queueSaved()
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(mock.query.update).toHaveBeenCalledWith(
      expect.objectContaining({ goal: 'maintain', kcal_target: 1800, kcal_is_manual: true }),
    )
  })

  it('validates the height', async () => {
    renderProfile({}, 80, '/profile/data')
    const height = await screen.findByLabelText('Estatura (cm)')
    await userEvent.clear(height)
    await userEvent.type(height, '90')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(await screen.findByText('Ingresa una estatura entre 100 y 250 cm')).toBeInTheDocument()
    expect(mock.query.update).not.toHaveBeenCalled()
  })
})
