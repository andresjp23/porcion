import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { supabase } from '@/lib/supabase'
import { renderWithAuth, resetSupabaseMock, signedInSession } from '@/test/renderWithAuth'
import { supabase as mock, queueQueryResult } from '@/test/supabaseMock'
import { PRIVACY_VERSION } from './consent'
import { ConsentPage } from './ConsentPage'

vi.mock('@/lib/supabase', () => import('@/test/supabaseMock'))

function renderConsent() {
  return renderWithAuth(
    [
      { path: '/consent', element: <ConsentPage /> },
      { path: '/', element: <h1>Hoy</h1> },
    ],
    { path: '/consent', session: signedInSession },
  )
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
    renderConsent()
    await userEvent.click(screen.getByRole('button', { name: 'Aceptar y continuar' }))
    expect(await screen.findByText('Debes aceptar para continuar')).toBeInTheDocument()
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('saves the policy version on the own profile and moves on', async () => {
    queueQueryResult({ data: [{ id: 'user-1' }], error: null })
    renderConsent()
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
    queueQueryResult(result)
    renderConsent()
    await acceptAll()
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos guardar tu respuesta.')
  })

  it('lets the user sign out instead', async () => {
    renderConsent()
    await userEvent.click(screen.getByRole('button', { name: 'Salir' }))
    expect(supabase.auth.signOut).toHaveBeenCalled()
  })
})
