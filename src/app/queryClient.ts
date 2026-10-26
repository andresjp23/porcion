import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import { QueryClient, type Query, type QueryKey } from '@tanstack/react-query'
import { persistQueryClient } from '@tanstack/react-query-persist-client'

/** How long a copy kept for offline use is worth restoring (Q-3). */
const OFFLINE_MAX_AGE = 7 * 24 * 60 * 60 * 1000

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      // gcTime at least the offline max age, or restored queries would be dropped.
      queries: {
        staleTime: 30_000,
        gcTime: OFFLINE_MAX_AGE,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  })
}

/**
 * Q-3 (docs/spec.md §7): what stays readable without a connection. Hoy (the
 * profile with the target and the day's logs), and the recents, favorites and
 * meal preps of Agregar alimento. Searches and everything else need the network.
 */
export function isOfflineReadable(queryKey: QueryKey) {
  const [root, sub] = queryKey
  return (
    root === 'profile' ||
    root === 'day' ||
    (root === 'logs' && sub === 'any') ||
    (root === 'foods' && (sub === 'recent' || sub === 'favorites')) ||
    // MP-6: Agregar shows the active batches, also without a connection.
    root === 'meal-preps'
  )
}

const STORAGE_PREFIX = 'porcion-offline:'

/** localStorage may throw (private mode, blocked storage): then nothing is kept. */
function safeStorage(): Storage | undefined {
  try {
    return window.localStorage
  } catch {
    return undefined
  }
}

/**
 * Keeps the offline-readable queries of `userId` on the device, under a key of
 * their own, and restores them. Copies of any other user are deleted, so a
 * shared phone never shows someone else's day. Returns how to stop, and a
 * promise for the end of the restore (saving starts then).
 */
export function persistForUser(queryClient: QueryClient, userId: string) {
  const storage = safeStorage()
  if (!storage) return { stop: () => {}, restored: Promise.resolve() }
  removeOfflineCopies(storage, userId)
  const [stop, restored] = persistQueryClient({
    queryClient,
    persister: createAsyncStoragePersister({ storage, key: STORAGE_PREFIX + userId }),
    maxAge: OFFLINE_MAX_AGE,
    // Bump when a persisted query changes shape, so old copies are discarded.
    buster: '1',
    dehydrateOptions: {
      shouldDehydrateQuery: (query: Query) =>
        query.state.status === 'success' && isOfflineReadable(query.queryKey),
    },
  })
  return { stop, restored }
}

/** Deletes every offline copy except the one of `keepUserId` (none if omitted). */
export function removeOfflineCopies(storage = safeStorage(), keepUserId?: string) {
  if (!storage) return
  for (const key of Object.keys(storage)) {
    if (key.startsWith(STORAGE_PREFIX) && key !== STORAGE_PREFIX + keepUserId) {
      storage.removeItem(key)
    }
  }
}
