import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { supabase } from '@/lib/supabase'
import { renderWithAuth, resetSupabaseMock, signedInSession } from '@/test/renderWithAuth'
import { supabase as mock, queueQueryResult, setTableDefault } from '@/test/supabaseMock'
import { PRIVACY_VERSION } from './consent'
import { ConsentPage } from './ConsentPage'

vi.mock('@/lib/supabase', () => import('@/test/supabaseMock'))

/** A profile that never accepted, unless `acceptedVersion` says which older one. */
async function renderConsent(acceptedVersion: string | null = null) {
  setTableDefault('profiles', {
    data: {
      id: 'user-1',
      privacy_version: acceptedVersion,
      privacy_accepted_at: acceptedVersion && '2026-01-01T12:00:00Z',
    },
    error: null,
  })
  const router = renderWithAuth(
    [
      { path: '/consent', element: <ConsentPage /> },
      { path: '/', element: <h1>Hoy</h1> },
    ],
    { path: '/consent', session: signedInSession },
  )
  // The profile has loaded: results queued from here on go to the save.
  await screen.findByRole('heading', {
    name: acceptedVersion ? 'Actualizamos nuestras condiciones' : 'Antes de empezar',
  })
  return router
}

async function acceptAll() {
  const user = userEvent.setup()
  await user.click(screen.getByLabelText('Acepto los Términos y la Política de privacidad'))
  await user.click(screen.getByLabelText('Soy mayor de 18 años'))
  await user.click(screen.getByRole('button', { name: 'Aceptar y continuar' }))
}

describe('ConsentPage', () => {
  beforeEach(() => {
    resetSupabaseMock()
  })

  it('requires both boxes before saving', async () => {
    await renderConsent()
    await userEvent.click(screen.getByRole('button', { name: 'Aceptar y continuar' }))
    expect(await screen.findByText('Debes aceptar para continuar')).toBeInTheDocument()
    expect(mock.query.update).not.toHaveBeenCalled()
  })

  it('saves the policy version on the own profile and moves on', async () => {
    await renderConsent()
    queueQueryResult('profiles', { data: [{ id: 'user-1' }], error: null })
    await acceptAll()
    expect(supabase.from).toHaveBeenCalledWith('profiles')
    expect(mock.query.update).toHaveBeenCalledWith({ privacy_version: PRIVACY_VERSION })
    expect(mock.query.eq).toHaveBeenCalledWith('id', 'user-1')
    expect(mock.query.select).toHaveBeenCalledWith('id')
    expect(await screen.findByRole('heading', { name: 'Hoy' })).toBeInTheDocument()
  })

  it.each([
    ['saving fails', { data: null, error: { message: 'x' } }],
    ['no profile row was updated', { data: [], error: null }],
  ])('stays on the page if %s', async (_, result) => {
    await renderConsent()
    queueQueryResult('profiles', result)
    await acceptAll()
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos guardar tu respuesta.')
  })

  it('explains that the policy changed to someone who accepted an older one (U-4c)', async () => {
    await renderConsent('2020-01')
    expect(screen.getByText(/Cambiaron los Términos o la Política de privacidad/)).toBeVisible()
    queueQueryResult('profiles', { data: [{ id: 'user-1' }], error: null })
    await acceptAll()
    expect(mock.query.update).toHaveBeenCalledWith({ privacy_version: PRIVACY_VERSION })
  })

  it('lets the user sign out instead', async () => {
    await renderConsent()
    await userEvent.click(screen.getByRole('button', { name: 'Salir' }))
    expect(supabase.auth.signOut).toHaveBeenCalled()
  })
})
