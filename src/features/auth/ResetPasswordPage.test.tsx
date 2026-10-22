import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { supabase } from '@/lib/supabase'
import { renderWithAuth, signedInSession } from '@/test/renderWithAuth'
import { ResetPasswordPage } from './ResetPasswordPage'

vi.mock('@/lib/supabase', () => import('@/test/supabaseMock'))

const auth = vi.mocked(supabase.auth)

function renderReset(session: typeof signedInSession | null = signedInSession) {
  return renderWithAuth(
    [
      { path: '/reset-password', element: <ResetPasswordPage /> },
      { path: '/', element: <h1>Hoy</h1> },
    ],
    { path: '/reset-password', session },
  )
}

async function submit(password: string, confirm: string) {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('Contraseña nueva'), password)
  await user.type(screen.getByLabelText('Repite la contraseña'), confirm)
  await user.click(screen.getByRole('button', { name: 'Guardar contraseña' }))
}

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('explains an invalid or expired link and offers a new one', () => {
    renderReset(null)
    expect(screen.getByRole('heading', { name: 'El enlace no es válido' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Pedir otro enlace' })).toHaveAttribute(
      'href',
      '/forgot-password',
    )
  })

  it('checks that both passwords match', async () => {
    renderReset()
    await submit('nueva-clave-1', 'nueva-clave-2')
    expect(await screen.findByText('Las contraseñas no coinciden')).toBeInTheDocument()
    expect(auth.updateUser).not.toHaveBeenCalled()
  })

  it('saves the new password and goes to Hoy', async () => {
    auth.updateUser.mockResolvedValue({ data: {}, error: null } as never)
    renderReset()
    await submit('nueva-clave-1', 'nueva-clave-1')
    expect(auth.updateUser).toHaveBeenCalledWith({ password: 'nueva-clave-1' })
    expect(await screen.findByRole('heading', { name: 'Hoy' })).toBeInTheDocument()
  })

  it('asks for a different password when it is the same as before', async () => {
    auth.updateUser.mockResolvedValue({ data: null, error: { code: 'same_password' } } as never)
    renderReset()
    await submit('vieja-clave-1', 'vieja-clave-1')
    expect(
      await screen.findByText('Elige una contraseña distinta a la anterior'),
    ).toBeInTheDocument()
  })
})
