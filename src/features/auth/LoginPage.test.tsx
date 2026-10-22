import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { supabase } from '@/lib/supabase'
import { renderWithAuth, signedInSession } from '@/test/renderWithAuth'
import { LoginPage } from './LoginPage'

vi.mock('@/lib/supabase', () => import('@/test/supabaseMock'))

const auth = vi.mocked(supabase.auth)

function renderLogin(session: typeof signedInSession | null = null) {
  return renderWithAuth(
    [
      { path: '/login', element: <LoginPage /> },
      { path: '/', element: <h1>Hoy</h1> },
    ],
    { path: '/login', session },
  )
}

async function fillAndSubmit(email: string, password: string) {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('Correo'), email)
  await user.type(screen.getByLabelText('Contraseña'), password)
  await user.click(screen.getByRole('button', { name: 'Ingresar' }))
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows the form with labelled fields and both sign-in options', () => {
    renderLogin()
    expect(
      screen.getByRole('heading', { name: 'Registra lo que comes en segundos' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continuar con Google' })).toBeInTheDocument()
    expect(screen.getByLabelText('Correo')).toHaveAttribute('type', 'email')
    expect(screen.getByLabelText('Contraseña')).toHaveAttribute('type', 'password')
    expect(screen.getByRole('link', { name: 'Crear cuenta' })).toHaveAttribute('href', '/signup')
  })

  it('validates the fields before calling Supabase', async () => {
    renderLogin()
    await fillAndSubmit('no-es-correo', 'corta')
    expect(await screen.findByText('Ingresa un correo válido')).toBeInTheDocument()
    expect(screen.getByText('La contraseña tiene mínimo 8 caracteres')).toBeInTheDocument()
    expect(auth.signInWithPassword).not.toHaveBeenCalled()
  })

  it('signs in with email and goes to Hoy', async () => {
    auth.signInWithPassword.mockResolvedValue({ data: {}, error: null } as never)
    const router = renderLogin()
    await fillAndSubmit('ana@correo.cl', 'secreta123')
    expect(auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'ana@correo.cl',
      password: 'secreta123',
    })
    expect(await screen.findByRole('heading', { name: 'Hoy' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/')
  })

  it('explains wrong credentials without leaving the page', async () => {
    auth.signInWithPassword.mockResolvedValue({
      data: {},
      error: { code: 'invalid_credentials' },
    } as never)
    renderLogin()
    await fillAndSubmit('ana@correo.cl', 'equivocada')
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El correo o la contraseña no coinciden.',
    )
  })

  it('starts Google sign-in and returns to the app', async () => {
    auth.signInWithOAuth.mockResolvedValue({ data: {}, error: null } as never)
    renderLogin()
    await userEvent.click(screen.getByRole('button', { name: 'Continuar con Google' }))
    expect(auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
  })

  it('shows an error if Google cannot start', async () => {
    auth.signInWithOAuth.mockResolvedValue({ data: {}, error: { message: 'x' } } as never)
    renderLogin()
    await userEvent.click(screen.getByRole('button', { name: 'Continuar con Google' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos conectar con Google.')
    expect(screen.getByRole('button', { name: 'Continuar con Google' })).toBeEnabled()
  })

  it('sends a signed-in user to Hoy', async () => {
    renderLogin(signedInSession)
    expect(await screen.findByRole('heading', { name: 'Hoy' })).toBeInTheDocument()
  })
})
