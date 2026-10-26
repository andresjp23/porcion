import type { Session } from '@supabase/supabase-js'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render } from '@testing-library/react'
import { supabase } from '@/lib/supabase'
import { AuthProvider } from './AuthProvider'

vi.mock('@/lib/supabase', () => import('@/test/supabaseMock'))

type Listener = (event: string, session: Session | null) => void

const session = (id: string) => ({ user: { id } }) as Session

function renderProvider() {
  let emit: Listener = () => {}
  vi.mocked(supabase.auth.onAuthStateChange).mockImplementation((callback) => {
    emit = callback as Listener
    return { data: { subscription: { unsubscribe: vi.fn() } } } as never
  })
  const queryClient = new QueryClient()
  render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{null}</AuthProvider>
    </QueryClientProvider>,
  )
  return { queryClient, emit: (event: string, s: Session | null) => act(() => emit(event, s)) }
}

describe('AuthProvider', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('keeps the cache across token refreshes of the same user', () => {
    const { queryClient, emit } = renderProvider()
    emit('INITIAL_SESSION', session('user-1'))
    queryClient.setQueryData(['day', '2026-10-22'], ['mine'])
    emit('TOKEN_REFRESHED', session('user-1'))
    expect(queryClient.getQueryData(['day', '2026-10-22'])).toEqual(['mine'])
  })

  it('drops the cache and the offline copy when signing out', () => {
    const { queryClient, emit } = renderProvider()
    emit('INITIAL_SESSION', session('user-1'))
    queryClient.setQueryData(['day', '2026-10-22'], ['mine'])
    localStorage.setItem('porcion-offline:user-1', '{"day":"mine"}')

    emit('SIGNED_OUT', null)
    expect(queryClient.getQueryData(['day', '2026-10-22'])).toBeUndefined()
    expect(localStorage.getItem('porcion-offline:user-1')).toBeNull()
  })

  it('never shows one user the cache of another', () => {
    const { queryClient, emit } = renderProvider()
    emit('INITIAL_SESSION', session('user-1'))
    queryClient.setQueryData(['day', '2026-10-22'], ['of user 1'])
    emit('SIGNED_IN', session('user-2'))
    expect(queryClient.getQueryData(['day', '2026-10-22'])).toBeUndefined()
  })
})
