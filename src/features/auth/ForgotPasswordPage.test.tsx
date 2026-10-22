import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { supabase } from '@/lib/supabase'
import { renderWithAuth } from '@/test/renderWithAuth'
import { ForgotPasswordPage } from './ForgotPasswordPage'

vi.mock('@/lib/supabase', () => import('@/test/supabaseMock'))

const auth = vi.mocked(supabase.auth)

async function requestLink(email: string) {
  renderWithAuth([{ path: '/forgot-password', element: <ForgotPasswordPage /> }], {
    path: '/forgot-password',
  })
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('Correo'), email)
  await user.click(screen.getByRole('button', { name: 'Enviar enlace' }))
}

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('validates the email first', async () => {
    await requestLink('no-es-correo')
    expect(await screen.findByText('Ingresa un correo válido')).toBeInTheDocument()
    expect(auth.resetPasswordForEmail).not.toHaveBeenCalled()
  })

  it('sends a link back to /reset-password (HU-01 CA4)', async () => {
    auth.resetPasswordForEmail.mockResolvedValue({ data: {}, error: null } as never)
    await requestLink('ana@correo.cl')
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith('ana@correo.cl', {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    expect(await screen.findByRole('heading', { name: 'Revisa tu correo' })).toBeInTheDocument()
    // Does not reveal whether the account exists.
    expect(screen.getByText(/Si hay una cuenta con ana@correo\.cl/)).toBeInTheDocument()
  })

  it('explains the rate limit', async () => {
    auth.resetPasswordForEmail.mockResolvedValue({
      data: null,
      error: { code: 'over_email_send_rate_limit' },
    } as never)
    await requestLink('ana@correo.cl')
    expect(await screen.findByRole('alert')).toHaveTextContent('Espera un momento')
  })
})
