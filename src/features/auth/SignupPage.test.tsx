import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { supabase } from '@/lib/supabase'
import { renderWithAuth } from '@/test/renderWithAuth'
import { PRIVACY_VERSION } from './consent'
import { SignupPage } from './SignupPage'

vi.mock('@/lib/supabase', () => import('@/test/supabaseMock'))

const auth = vi.mocked(supabase.auth)

function renderSignup() {
  return renderWithAuth(
    [
      { path: '/signup', element: <SignupPage /> },
      { path: '/', element: <h1>Hoy</h1> },
    ],
    { path: '/signup' },
  )
}

async function fillForm({ consent = true } = {}) {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('Correo'), 'ana@correo.cl')
  await user.type(screen.getByLabelText('Contraseña'), 'secreta123')
  if (consent) {
    await user.click(screen.getByLabelText('Acepto los Términos y la Política de privacidad'))
    await user.click(screen.getByLabelText('Soy mayor de 18 años'))
  }
  await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))
}

describe('SignupPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('requires accepting the policy and confirming age (HU-01 CA2)', async () => {
    renderSignup()
    await fillForm({ consent: false })
    expect(await screen.findByText('Debes aceptar para continuar')).toBeInTheDocument()
    expect(screen.getByText('La app es solo para mayores de 18 años')).toBeInTheDocument()
    expect(auth.signUp).not.toHaveBeenCalled()
  })

  it('signs up sending the accepted policy version and goes to Hoy', async () => {
    auth.signUp.mockResolvedValue({
      data: { user: { identities: [{}] }, session: {} },
      error: null,
    } as never)
    const router = renderSignup()
    await fillForm()
    expect(auth.signUp).toHaveBeenCalledWith({
      email: 'ana@correo.cl',
      password: 'secreta123',
      options: {
        data: { privacy_version: PRIVACY_VERSION },
        emailRedirectTo: window.location.origin,
      },
    })
    expect(await screen.findByRole('heading', { name: 'Hoy' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/')
  })

  it('asks to check the inbox when email confirmation is on', async () => {
    auth.signUp.mockResolvedValue({
      data: { user: { identities: [{}] }, session: null },
      error: null,
    } as never)
    renderSignup()
    await fillForm()
    expect(await screen.findByRole('heading', { name: 'Revisa tu correo' })).toBeInTheDocument()
    expect(screen.getByText(/ana@correo\.cl/)).toBeInTheDocument()
  })

  it.each([
    ['an error', { data: { user: null, session: null }, error: { code: 'user_already_exists' } }],
    ['no identities', { data: { user: { identities: [] }, session: null }, error: null }],
  ])(
    'shows a clear message next to the email when it is taken (%s, HU-01 CA3)',
    async (_, result) => {
      auth.signUp.mockResolvedValue(result as never)
      renderSignup()
      await fillForm()
      expect(
        await screen.findByText(
          'Ya existe una cuenta con este correo. Ingresa o recupera tu contraseña.',
        ),
      ).toBeInTheDocument()
      expect(screen.getByLabelText('Correo')).toHaveAttribute('aria-invalid', 'true')
    },
  )
})
