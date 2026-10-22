import { screen } from '@testing-library/react'
import { supabase } from '@/lib/supabase'
import { renderWithAuth, resetSupabaseMock, signedInSession } from '@/test/renderWithAuth'
import { queueQueryResult } from '@/test/supabaseMock'
import { StageGuard } from './StageGuard'

vi.mock('@/lib/supabase', () => import('@/test/supabaseMock'))

const done = '2026-10-22T12:00:00Z'

// Each stage's screen is a heading, so the test can see where the guard landed.
const routes = [
  { path: '/login', element: <h1>Ingresar</h1> },
  {
    element: <StageGuard stage="consent" />,
    children: [{ path: '/consent', element: <h1>Consentimiento</h1> }],
  },
  {
    element: <StageGuard stage="onboarding" />,
    children: [{ path: '/onboarding/:step', element: <h1>Onboarding</h1> }],
  },
  { element: <StageGuard stage="app" />, children: [{ path: '/', element: <h1>Hoy</h1> }] },
]

function profile(privacy: string | null, onboarding: string | null) {
  return {
    data: { id: 'user-1', privacy_accepted_at: privacy, onboarding_completed_at: onboarding },
    error: null,
  }
}

describe('StageGuard', () => {
  beforeEach(() => {
    resetSupabaseMock()
  })

  it('sends visitors without a session to Ingresar', async () => {
    renderWithAuth(routes, { path: '/' })
    expect(await screen.findByRole('heading', { name: 'Ingresar' })).toBeInTheDocument()
  })

  it('sends users without consent to /consent', async () => {
    queueQueryResult(profile(null, null))
    const router = renderWithAuth(routes, { path: '/', session: signedInSession })
    expect(await screen.findByRole('heading', { name: 'Consentimiento' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/consent')
  })

  it('sends users without onboarding to step 1', async () => {
    queueQueryResult(profile(done, null))
    const router = renderWithAuth(routes, { path: '/', session: signedInSession })
    expect(await screen.findByRole('heading', { name: 'Onboarding' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/onboarding/1')
  })

  it('lets set-up users into the app', async () => {
    queueQueryResult(profile(done, done))
    renderWithAuth(routes, { path: '/', session: signedInSession })
    expect(await screen.findByRole('heading', { name: 'Hoy' })).toBeInTheDocument()
  })

  it('keeps set-up users out of earlier stages', async () => {
    queueQueryResult(profile(done, done))
    const router = renderWithAuth(routes, { path: '/consent', session: signedInSession })
    expect(await screen.findByRole('heading', { name: 'Hoy' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/')
  })

  it('signs out a session whose profile no longer exists', async () => {
    queueQueryResult({ data: null, error: null })
    renderWithAuth(routes, { path: '/', session: signedInSession })
    await vi.waitFor(() => expect(supabase.auth.signOut).toHaveBeenCalled())
  })

  it('offers a retry when the profile cannot load', async () => {
    queueQueryResult({ data: null, error: { message: 'offline' } })
    renderWithAuth(routes, { path: '/', session: signedInSession })
    expect(await screen.findByText('No pudimos cargar tu cuenta.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })
})
