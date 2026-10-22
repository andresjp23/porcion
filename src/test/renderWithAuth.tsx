import type { Session } from '@supabase/supabase-js'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { supabase } from '@/lib/supabase'
import { resetQueryResults } from './supabaseMock'

/**
 * Renders routes inside the app providers with the given session. Needs
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
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>,
  )
  return router
}

export const signedInSession = { user: { id: 'user-1' } } as Partial<Session>

/** Clears mock calls and queued query results between tests. */
export function resetSupabaseMock() {
  vi.clearAllMocks()
  resetQueryResults()
}
