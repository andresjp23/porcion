import { act, render, screen } from '@testing-library/react'
import { Toast } from './Toast'

describe('Toast', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('announces the message and goes away after a while', () => {
    const onDismiss = vi.fn()
    render(<Toast message="Agregaste Huevo a Almuerzo" onDismiss={onDismiss} durationMs={3000} />)
    expect(screen.getByRole('status')).toHaveTextContent('Agregaste Huevo a Almuerzo')

    act(() => vi.advanceTimersByTime(2999))
    expect(onDismiss).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(1))
    expect(onDismiss).toHaveBeenCalledOnce()
  })

  it('restarts the timer when the message changes', () => {
    const onDismiss = vi.fn()
    const { rerender } = render(<Toast message="Uno" onDismiss={onDismiss} durationMs={3000} />)
    act(() => vi.advanceTimersByTime(2000))
    rerender(<Toast message="Dos" onDismiss={onDismiss} durationMs={3000} />)
    act(() => vi.advanceTimersByTime(2000))
    expect(onDismiss).not.toHaveBeenCalled()
  })
})
