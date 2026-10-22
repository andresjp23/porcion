import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Tables } from '@/lib/database.types'
import { renderWithAuth, resetSupabaseMock, signedInSession } from '@/test/renderWithAuth'
import { supabase as mock, queueQueryResult, setTableDefault } from '@/test/supabaseMock'
import { OnboardingPage } from './OnboardingPage'

vi.mock('@/lib/supabase', () => import('@/test/supabaseMock'))

function makeProfile(overrides: Partial<Tables<'profiles'>> = {}): Tables<'profiles'> {
  return {
    id: 'user-1',
    display_name: null,
    sex: null,
    birth_date: null,
    height_cm: null,
    activity: null,
    goal: null,
    kcal_target: null,
    protein_g: null,
    carbs_g: null,
    fat_g: null,
    kcal_is_manual: false,
    macros_are_manual: false,
    timezone: 'America/Santiago',
    privacy_version: '2026-10',
    privacy_accepted_at: '2026-10-22T12:00:00Z',
    onboarding_completed_at: null,
    created_at: '2026-10-22T12:00:00Z',
    ...overrides,
  }
}

const afterStep1 = { sex: 'female', birth_date: '1990-05-15' } as const

function given(profile: Tables<'profiles'>, weightKg: number | null = null) {
  setTableDefault('profiles', { data: profile, error: null })
  setTableDefault('weight_entries', {
    data: weightKg === null ? null : { date: '2026-10-22', weight_kg: weightKg },
    error: null,
  })
}

function renderStep(step: number) {
  return renderWithAuth([{ path: '/onboarding/:step', element: <OnboardingPage /> }], {
    path: `/onboarding/${step}`,
    session: signedInSession,
  })
}

describe('OnboardingPage', () => {
  beforeEach(() => {
    resetSupabaseMock()
  })

  it('does not let a typed URL skip unanswered steps', async () => {
    given(makeProfile())
    const router = renderStep(3)
    expect(await screen.findByRole('heading', { name: 'Cuéntanos de ti' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/onboarding/1')
  })

  it('saves step 1 and moves to step 2', async () => {
    given(makeProfile())
    renderStep(1)
    const user = userEvent.setup()
    await user.click(await screen.findByRole('radio', { name: 'Mujer' }))
    await user.type(screen.getByLabelText('Fecha de nacimiento'), '1990-05-15')

    queueQueryResult('profiles', { data: [{ id: 'user-1' }], error: null })
    given(makeProfile(afterStep1))
    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    expect(mock.query.update).toHaveBeenCalledWith({ sex: 'female', birth_date: '1990-05-15' })
    expect(await screen.findByRole('heading', { name: 'Tu estatura y peso' })).toBeInTheDocument()
  })

  it('saves height on the profile and today’s weight as an upsert, with a decimal comma', async () => {
    given(makeProfile(afterStep1))
    renderStep(2)
    const user = userEvent.setup()
    await user.type(await screen.findByLabelText('Estatura (cm)'), '165')
    await user.type(screen.getByLabelText('Peso (kg)'), '62,5')

    queueQueryResult('profiles', { data: [{ id: 'user-1' }], error: null })
    queueQueryResult('weight_entries', { data: null, error: null })
    given(makeProfile({ ...afterStep1, height_cm: 165 }), 62.5)
    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    expect(mock.query.update).toHaveBeenCalledWith({ height_cm: 165 })
    expect(mock.query.upsert).toHaveBeenCalledWith(
      { date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/), weight_kg: 62.5 },
      { onConflict: 'user_id,date' },
    )
    expect(await screen.findByRole('heading', { name: '¿Cuánto te mueves?' })).toBeInTheDocument()
  })

  it('keeps earlier answers when going back (HU-02 CA2)', async () => {
    given(makeProfile({ ...afterStep1, height_cm: 165 }), 62.5)
    renderStep(2)
    expect(await screen.findByLabelText('Peso (kg)')).toHaveValue('62,5')
    await userEvent.click(screen.getByRole('button', { name: 'Volver al paso anterior' }))
    expect(await screen.findByRole('radio', { name: 'Mujer' })).toBeChecked()
    expect(screen.getByLabelText('Fecha de nacimiento')).toHaveValue('1990-05-15')
  })

  it('asks to choose before continuing', async () => {
    given(makeProfile({ ...afterStep1, height_cm: 165 }), 62.5)
    renderStep(3)
    await userEvent.click(await screen.findByRole('button', { name: 'Continuar' }))
    expect(await screen.findByText('Elige una opción')).toBeInTheDocument()
    expect(mock.query.update).not.toHaveBeenCalled()
  })

  it('stays on the step if saving fails', async () => {
    given(makeProfile({ ...afterStep1, height_cm: 165, activity: 'light' }), 62.5)
    renderStep(4)
    const user = userEvent.setup()
    await user.click(await screen.findByRole('radio', { name: /Bajar de peso/ }))
    queueQueryResult('profiles', { data: null, error: { message: 'x' } })
    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos guardar tu respuesta.')
    expect(screen.getByRole('heading', { name: '¿Cuál es tu objetivo?' })).toBeInTheDocument()
  })
})
