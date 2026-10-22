// Stand-in for '@/lib/supabase' in component tests:
//   vi.mock('@/lib/supabase', () => import('@/test/supabaseMock'))
// Each test sets the results it needs with mockResolvedValue.

const update = vi.fn()
const eq = vi.fn()

export const supabase = {
  auth: {
    onAuthStateChange: vi.fn(),
    signInWithPassword: vi.fn(),
    signInWithOAuth: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
  },
  // Covers `from(table).update(values).eq(column, value)`.
  from: vi.fn(() => ({ update })),
  query: { update, eq },
}

update.mockImplementation(() => ({ eq }))
