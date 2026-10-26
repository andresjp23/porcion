import { screen } from '@testing-library/react'
import { renderWithAuth, resetSupabaseMock, signedInSession } from '@/test/renderWithAuth'
import { queueQueryResult } from '@/test/supabaseMock'
import { routes } from './router'

vi.mock('@/lib/supabase', () => import('@/test/supabaseMock'))

describe('router', () => {
  beforeEach(() => {
    resetSupabaseMock()
  })

  it('renders the Today page at / for a set-up user', async () => {
    const done = '2026-10-22T12:00:00Z'
    queueQueryResult('profiles', {
      data: { id: 'user-1', privacy_accepted_at: done, onboarding_completed_at: done },
      error: null,
    })
    renderWithAuth(routes, { path: '/', session: signedInSession })
    expect(await screen.findByRole('heading', { name: 'Hoy vas bien' })).toBeInTheDocument()
  })

  it('shows Ingresar at / without a session', async () => {
    renderWithAuth(routes, { path: '/' })
    expect(
      await screen.findByRole('heading', { name: 'Registra lo que comes en segundos' }),
    ).toBeInTheDocument()
  })

  it.each([
    ['/privacy', 'Política de privacidad'],
    ['/terms', 'Términos'],
  ])('opens %s without a session, marked as a draft (U-4)', async (path, title) => {
    renderWithAuth(routes, { path })
    expect(await screen.findByRole('heading', { level: 1, name: title })).toBeInTheDocument()
    expect(screen.getByRole('note')).toHaveTextContent('Borrador no revisado legalmente')
    expect(screen.getByText('Versión 2026-10')).toBeInTheDocument()
  })
})
