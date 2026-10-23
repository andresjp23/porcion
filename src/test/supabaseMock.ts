// Stand-in for '@/lib/supabase' in component tests:
//   vi.mock('@/lib/supabase', () => import('@/test/supabaseMock'))
// Auth calls are plain mocks; set their results with mockResolvedValue.

type QueryResult = { data: unknown; error: unknown }

const queued = new Map<string, QueryResult[]>()
const defaults = new Map<string, QueryResult>()

/** Spies shared by every query, to assert how a chain was built. */
const query = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  upsert: vi.fn(),
  delete: vi.fn(),
  eq: vi.fn(),
  order: vi.fn(),
  limit: vi.fn(),
  maybeSingle: vi.fn(),
  abortSignal: vi.fn(),
}

/**
 * A query builder like PostgREST's: every method chains, and awaiting the chain
 * resolves to the next result queued for its table, else the table's default.
 */
function builder(table: string) {
  const chain: Record<string, unknown> = {}
  for (const [name, spy] of Object.entries(query)) {
    chain[name] = (...args: unknown[]) => {
      spy(...args)
      return chain
    }
  }
  chain.then = (
    resolve: (value: QueryResult) => unknown,
    reject?: (reason: unknown) => unknown,
  ) => {
    const result = queued.get(table)?.shift() ?? defaults.get(table) ?? { data: null, error: null }
    return Promise.resolve(result).then(resolve, reject)
  }
  return chain
}

/** Queues what the next awaited `supabase.rpc(fn)` calls return, in order. */
export function queueRpcResult(fn: string, ...results: QueryResult[]) {
  queueQueryResult(`rpc:${fn}`, ...results)
}

/** What `supabase.rpc(fn)` returns once its queue is empty. */
export function setRpcDefault(fn: string, result: QueryResult) {
  setTableDefault(`rpc:${fn}`, result)
}

/** Queues what the next awaited `supabase.from(table)` chains return, in order. */
export function queueQueryResult(table: string, ...results: QueryResult[]) {
  queued.set(table, [...(queued.get(table) ?? []), ...results])
}

/** What `supabase.from(table)` returns once its queue is empty (e.g. refetches). */
export function setTableDefault(table: string, result: QueryResult) {
  defaults.set(table, result)
}

export function resetQueryResults() {
  queued.clear()
  defaults.clear()
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
  from: vi.fn(builder),
  // RPC results share the table queues under the key `rpc:<fn>`.
  rpc: vi.fn<(fn: string, args?: unknown) => ReturnType<typeof builder>>((fn) =>
    builder(`rpc:${fn}`),
  ),
  query,
}
