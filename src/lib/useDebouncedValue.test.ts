import { act, renderHook } from '@testing-library/react'
import { useDebouncedValue } from './useDebouncedValue'

describe('useDebouncedValue', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('waits until the value stops changing', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 250), {
      initialProps: { value: 'p' },
    })
    rerender({ value: 'pa' })
    act(() => vi.advanceTimersByTime(200))
    rerender({ value: 'pal' })
    act(() => vi.advanceTimersByTime(200))
    expect(result.current).toBe('p')

    act(() => vi.advanceTimersByTime(50))
    expect(result.current).toBe('pal')
  })
})
