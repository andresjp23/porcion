import type { Session } from '@supabase/supabase-js'
import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { supabase } from '@/lib/supabase'

/**
 * Renders routes inside AuthProvider with the given session. Needs
 * `vi.mock('@/lib/supabase', () => import('@/test/supabaseMock'))` in the test file.
 */
export function renderWithAuth(
  routes: RouteObject[],
  { path, session = null }: { path: string; session?: Partial<Session> | null },
) {
  vi.mocked(supabase.auth.onAuthStateChange).mockImplementation((callback) => {
    void callback('INITIAL_SESSION', session as Session | null)
    return { data: { subscription: { unsubscribe: vi.fn() } } } as never
  })
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>,
  )
  return router
}

export const signedInSession = { user: { id: 'user-1' } } as Partial<Session>
