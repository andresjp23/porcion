import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Tables } from '@/lib/database.types'
import { renderWithAuth, resetSupabaseMock, signedInSession } from '@/test/renderWithAuth'
import { supabase as mock, queueQueryResult, setTableDefault } from '@/test/supabaseMock'
import { OnboardingPage } from './OnboardingPage'

vi.mock('@/lib/supabase', () => import('@/test/supabaseMock'))

// Man, 30 years old on 2026-10-22, 178 cm, 80 kg, moderate activity, losing weight:
// BMR 1767.5 × 1.55 = 2739.6 − 500 → 2240 kcal; macros 128 g / 264 g / 75 g.
const profile: Tables<'profiles'> = {
  id: 'user-1',
  display_name: null,
  sex: 'male',
  birth_date: '1996-05-15',
  height_cm: 178,
  activity: 'moderate',
  goal: 'lose',
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
}

function renderTarget() {
  setTableDefault('profiles', { data: profile, error: null })
  setTableDefault('weight_entries', { data: { date: '2026-10-22', weight_kg: 80 }, error: null })
  return renderWithAuth(
    [
      { path: '/onboarding/:step', element: <OnboardingPage /> },
      { path: '/', element: <h1>Hoy</h1> },
    ],
    { path: '/onboarding/5', session: signedInSession },
  )
}

async function openAdjust() {
  await userEvent.click(await screen.findByRole('button', { name: 'Ajustar manualmente' }))
  return within(await screen.findByRole('dialog', { name: 'Ajustar mi meta' }))
}

async function replace(input: HTMLElement, value: string) {
  await userEvent.clear(input)
  await userEvent.type(input, value)
}

describe('TargetStep', () => {
  beforeEach(() => {
    resetSupabaseMock()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-22T15:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows the target with its breakdown and the suggested macros (HU-02 CA3)', async () => {
    renderTarget()
    expect(await screen.findByText('Metabolismo basal (Mifflin-St Jeor)')).toBeInTheDocument()
    expect(screen.getByText('1.768')).toBeInTheDocument()
    expect(screen.getByText('× 1,55 actividad moderada')).toBeInTheDocument()
    expect(screen.getByText('2.740')).toBeInTheDocument()
    expect(screen.getByText('– 500')).toBeInTheDocument()
    expect(screen.getByText('2.240 kcal')).toBeInTheDocument()
    expect(screen.getByText('128 g')).toBeInTheDocument()
    expect(screen.getByText('264 g')).toBeInTheDocument()
    expect(screen.getByText('75 g')).toBeInTheDocument()
  })

  it('saves the suggestion, finishes onboarding and opens Hoy (HU-02 CA4)', async () => {
    renderTarget()
    const start = await screen.findByRole('button', { name: 'Empezar' })
    // Queued after loading, so the initial profile read does not take it.
    queueQueryResult('profiles', { data: [{ id: 'user-1' }], error: null })
    await userEvent.click(start)
    expect(mock.query.update).toHaveBeenCalledWith({
      kcal_target: 2240,
      protein_g: 128,
      carbs_g: 264,
      fat_g: 75,
      kcal_is_manual: false,
      macros_are_manual: false,
      onboarding_completed_at: '2026-10-22T15:00:00.000Z',
    })
    expect(await screen.findByRole('heading', { name: 'Hoy' })).toBeInTheDocument()
  })

  it('re-suggests macros on a manual kcal target and saves it as manual (R-13)', async () => {
    renderTarget()
    const sheet = await openAdjust()
    await replace(sheet.getByLabelText('Meta diaria (kcal)'), '2000')
    // 128 g protein, 30 % fat → 67 g, carbs for the rest → 222 g
    expect(sheet.getByLabelText('Carbohidratos (g)')).toHaveValue('222')
    await userEvent.click(sheet.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByText('Meta ajustada a mano')).toBeInTheDocument()
    expect(screen.getByText('La meta sugerida era 2.240 kcal.')).toBeInTheDocument()

    queueQueryResult('profiles', { data: [{ id: 'user-1' }], error: null })
    await userEvent.click(screen.getByRole('button', { name: 'Empezar' }))
    expect(mock.query.update).toHaveBeenCalledWith(
      expect.objectContaining({
        kcal_target: 2000,
        carbs_g: 222,
        kcal_is_manual: true,
        macros_are_manual: false,
      }),
    )
  })

  it('warns when the macros do not add up to the target and offers to match it (R-13)', async () => {
    renderTarget()
    const sheet = await openAdjust()
    await replace(sheet.getByLabelText('Proteína (g)'), '200')
    // 800 + 1056 + 675 = 2531 kcal against 2240
    expect(
      sheet.getByText('Tus macros suman 2.531 kcal y tu meta es 2.240 kcal.'),
    ).toBeInTheDocument()
    await userEvent.click(sheet.getByRole('button', { name: 'Usar 2.531 kcal como meta' }))
    expect(sheet.getByLabelText('Meta diaria (kcal)')).toHaveValue('2531')
    expect(sheet.getByLabelText('Proteína (g)')).toHaveValue('200')
  })

  it('needs a confirmation for a target under the floor (R-05)', async () => {
    renderTarget()
    const sheet = await openAdjust()
    await replace(sheet.getByLabelText('Meta diaria (kcal)'), '1400')
    await userEvent.click(sheet.getByRole('button', { name: 'Guardar' }))
    expect(
      await sheet.findByText('Confirma que quieres usar una meta bajo el mínimo recomendado'),
    ).toBeInTheDocument()

    await userEvent.click(sheet.getByRole('checkbox', { name: /el mínimo recomendado/ }))
    await userEvent.click(sheet.getByRole('button', { name: 'Guardar' }))
    expect(await screen.findByText('1.400 kcal')).toBeInTheDocument()
  })

  it('goes back to the suggestion', async () => {
    renderTarget()
    const sheet = await openAdjust()
    await replace(sheet.getByLabelText('Meta diaria (kcal)'), '2000')
    await userEvent.click(sheet.getByRole('button', { name: 'Guardar' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Usar lo sugerido' }))
    expect(screen.getByText('2.240 kcal')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Usar lo sugerido' })).not.toBeInTheDocument()
  })
})
