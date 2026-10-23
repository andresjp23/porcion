import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { supabase as mock } from '@/test/supabaseMock'
import { dayKey, useAddLog, type LogEntry, type NewLog } from './api'

vi.mock('@/lib/supabase', () => import('@/test/supabaseMock'))

const existing: LogEntry = {
  id: 'log-1',
  foodId: 'food-bread',
  meal: 'breakfast',
  portionId: null,
  quantity: 100,
  grams: 100,
  foodName: 'Marraqueta',
  nutrients: { kcal: 272, protein: 10.8, carbs: 49.7, fat: 2.4 },
  createdAt: '2026-10-22T11:00:00Z',
}

const egg: NewLog & { id: string } = {
  id: '5e0c3a52-8d3b-4b3c-9a51-2f8f2b0f1a11',
  date: '2026-10-22',
  meal: 'breakfast',
  foodId: 'food-egg',
  portionId: 'portion-egg',
  quantity: 1,
  grams: 50,
  foodName: 'Huevo',
  nutrients: { kcal: 74, protein: 6.2, carbs: 0.5, fat: 5 },
}

function setup() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  queryClient.setQueryData(dayKey('2026-10-22'), [existing])
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  const { result } = renderHook(() => useAddLog(), { wrapper })
  const day = () => queryClient.getQueryData<LogEntry[]>(dayKey('2026-10-22'))
  return { result, day }
}

/** Makes the next `supabase.from()` an insert that resolves only when told to. */
function deferInsert() {
  let resolve: (value: { error: unknown }) => void = () => {}
  const insert = vi.fn(() => new Promise<{ error: unknown }>((r) => (resolve = r)))
  vi.mocked(mock.from).mockImplementationOnce((() => ({ insert })) as never)
  return { insert, resolve: (error: unknown = null) => resolve({ error }) }
}

describe('useAddLog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows the entry in the day before the server answers (L-3)', async () => {
    const { insert } = deferInsert()
    const { result, day } = setup()
    act(() => result.current.mutate(egg))

    await waitFor(() => expect(day()?.map((e) => e.foodName)).toEqual(['Marraqueta', 'Huevo']))
    expect(day()?.[1]?.id).toBe(egg.id)
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ id: egg.id, log_date: '2026-10-22', food_name: 'Huevo', kcal: 74 }),
    )
  })

  it('takes the entry out again when saving fails', async () => {
    const { resolve } = deferInsert()
    const { result, day } = setup()
    act(() => result.current.mutate(egg))
    await waitFor(() => expect(day()).toHaveLength(2))

    act(() => resolve(new Error('offline')))
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(day()).toEqual([existing])
  })
})
