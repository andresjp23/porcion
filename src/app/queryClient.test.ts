import {
  createQueryClient,
  isOfflineReadable,
  persistForUser,
  removeOfflineCopies,
} from './queryClient'

describe('isOfflineReadable', () => {
  it('keeps Hoy and the recents and favorites (Q-3)', () => {
    expect(isOfflineReadable(['profile', 'user-1'])).toBe(true)
    expect(isOfflineReadable(['day', '2026-10-22'])).toBe(true)
    expect(isOfflineReadable(['logs', 'any'])).toBe(true)
    expect(isOfflineReadable(['foods', 'recent'])).toBe(true)
    expect(isOfflineReadable(['foods', 'favorites'])).toBe(true)
    expect(isOfflineReadable(['meal-preps'])).toBe(true)
  })

  it('leaves out searches and the rest', () => {
    expect(isOfflineReadable(['foods', 'search', 'pan'])).toBe(false)
    expect(isOfflineReadable(['logs', 'range'])).toBe(false)
    expect(isOfflineReadable(['weight', 'history'])).toBe(false)
    expect(isOfflineReadable(['shopping', 'active'])).toBe(false)
  })
})

describe('persistForUser', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  // Real timers: the persister restores asynchronously and throttles its saves (1 s).
  const saved = (userId: string) => localStorage.getItem(`porcion-offline:${userId}`) ?? ''

  it('keeps only offline-readable queries, under the user key (Q-3)', async () => {
    const client = createQueryClient()
    const { stop, restored } = persistForUser(client, 'user-1')
    await restored
    client.setQueryData(['day', '2026-10-22'], [{ id: 'log-1' }])
    client.setQueryData(['foods', 'search', 'pan'], [{ id: 'food-1' }])
    await vi.waitFor(() => expect(saved('user-1')).toContain('log-1'), { timeout: 3000 })
    expect(saved('user-1')).not.toContain('food-1')
    stop()
  })

  it('restores them for the same user, after a reload', async () => {
    localStorage.setItem(
      'porcion-offline:user-1',
      JSON.stringify({
        buster: '1',
        timestamp: Date.now(),
        clientState: {
          mutations: [],
          queries: [
            {
              queryKey: ['foods', 'recent'],
              queryHash: '["foods","recent"]',
              state: { data: [{ id: 'food-1' }], status: 'success', dataUpdatedAt: Date.now() },
            },
          ],
        },
      }),
    )
    const client = createQueryClient()
    const { stop, restored } = persistForUser(client, 'user-1')
    await restored
    expect(client.getQueryData(['foods', 'recent'])).toEqual([{ id: 'food-1' }])
    stop()
  })

  it('deletes the copies of any other user', () => {
    localStorage.setItem('porcion-offline:user-2', '{}')
    localStorage.setItem('other-key', 'stays')
    persistForUser(createQueryClient(), 'user-1').stop()
    expect(localStorage.getItem('porcion-offline:user-2')).toBeNull()
    expect(localStorage.getItem('other-key')).toBe('stays')
  })
})

describe('removeOfflineCopies', () => {
  it('deletes every copy when no user is kept', () => {
    localStorage.setItem('porcion-offline:user-1', '{}')
    localStorage.setItem('porcion-offline:user-2', '{}')
    removeOfflineCopies()
    expect(Object.keys(localStorage).filter((key) => key.startsWith('porcion-offline:'))).toEqual(
      [],
    )
  })
})
