// Stand-in for '@/lib/supabase' in component tests:
//   vi.mock('@/lib/supabase', () => import('@/test/supabaseMock'))
// Auth calls are plain mocks; set their results with mockResolvedValue.

type QueryResult = { data: unknown; error: unknown }

const results: QueryResult[] = []

/**
 * A query builder like PostgREST's: every method chains, and awaiting the chain
 * resolves to the next result queued with `queueQueryResult`.
 */
const builder = {
  select: vi.fn(() => builder),
  update: vi.fn(() => builder),
  eq: vi.fn(() => builder),
  maybeSingle: vi.fn(() => builder),
  then(resolve: (value: QueryResult) => unknown, reject?: (reason: unknown) => unknown) {
    return Promise.resolve(results.shift() ?? { data: null, error: null }).then(resolve, reject)
  },
}

/** Queues what the next awaited `supabase.from(...)` chain returns. */
export function queueQueryResult(...queued: QueryResult[]) {
  results.push(...queued)
}

export function resetQueryResults() {
  results.length = 0
}

export const supabase = {
  auth: {
    onAuthStateChange: vi.fn(),
    signInWithPassword: vi.fn(),
    signInWithOAuth: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    updateUser: vi.fn(),
  },
  from: vi.fn(() => builder),
  query: builder,
}
