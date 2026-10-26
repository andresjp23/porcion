import { act, render, screen } from '@testing-library/react'
import { OfflineBanner } from './OfflineBanner'

function setOnline(online: boolean) {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(online)
  act(() => {
    window.dispatchEvent(new Event(online ? 'online' : 'offline'))
  })
}

describe('OfflineBanner', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('says so while offline, and goes away when the connection is back (Q-3)', () => {
    render(<OfflineBanner />)
    expect(screen.getByRole('status')).toBeEmptyDOMElement()

    setOnline(false)
    expect(screen.getByRole('status')).toHaveTextContent('Sin conexión')

    setOnline(true)
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })
})
