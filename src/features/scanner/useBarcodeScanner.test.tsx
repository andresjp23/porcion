import { act, render, screen } from '@testing-library/react'
import type { Barcode } from '@/domain/barcode'
import { resetDetector, type DetectedCode } from './detector'
import { useBarcodeScanner } from './useBarcodeScanner'

const ponyfillDetect = vi.fn<() => Promise<DetectedCode[]>>()
vi.mock('barcode-detector/ponyfill', () => ({
  BarcodeDetector: class {
    detect = ponyfillDetect
  },
  setZXingModuleOverrides: vi.fn(),
}))

const detect = vi.fn<() => Promise<DetectedCode[]>>()
const stopTrack = vi.fn()
const getUserMedia = vi.fn()

class FakeBarcodeDetector {
  static getSupportedFormats = vi.fn(async () => ['qr_code', 'ean_13', 'ean_8', 'upc_a', 'upc_e'])
  detect = detect
}

function Scanner(props: { onDetect: (barcode: Barcode) => void; paused?: boolean }) {
  const { videoRef, status, retry, torch } = useBarcodeScanner(props)
  return (
    <>
      <video ref={videoRef} muted playsInline />
      <p>{status}</p>
      <button onClick={retry}>retry</button>
      {torch && <button onClick={torch.toggle}>{torch.on ? 'torch on' : 'torch off'}</button>}
    </>
  )
}

/** Lets the camera, the reader and `n` frames resolve. */
async function frames(n = 1) {
  await act(() => vi.advanceTimersByTimeAsync(200 * n))
}

beforeEach(() => {
  vi.useFakeTimers()
  resetDetector()
  detect.mockResolvedValue([])
  getUserMedia.mockResolvedValue({ getTracks: () => [{ stop: stopTrack }] })
  Object.defineProperty(navigator, 'mediaDevices', {
    value: { getUserMedia },
    configurable: true,
  })
  vi.stubGlobal('BarcodeDetector', FakeBarcodeDetector)
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
  vi.spyOn(HTMLMediaElement.prototype, 'readyState', 'get').mockReturnValue(4)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('useBarcodeScanner', () => {
  it('opens the rear camera and reports a normalized code', async () => {
    const onDetect = vi.fn()
    detect.mockResolvedValue([{ rawValue: '036000291452', format: 'upc_a' }])
    render(<Scanner onDetect={onDetect} />)
    await frames()

    expect(getUserMedia).toHaveBeenCalledWith({
      video: { facingMode: { ideal: 'environment' } },
      audio: false,
    })
    expect(screen.getByText('scanning')).toBeInTheDocument()
    expect(onDetect).toHaveBeenCalledWith({ code: '0036000291452', format: 'upc_a' })
  })

  it('skips codes with a bad check digit', async () => {
    const onDetect = vi.fn()
    detect.mockResolvedValue([
      { rawValue: '7801234567891', format: 'ean_13' },
      { rawValue: '7802800000000', format: 'qr_code' },
    ])
    render(<Scanner onDetect={onDetect} />)
    await frames(3)
    expect(onDetect).not.toHaveBeenCalled()
  })

  it('counts a code held in view once, and again after it is gone for 2 s', async () => {
    const onDetect = vi.fn()
    const seen = [{ rawValue: '96385074', format: 'ean_8' }]
    detect.mockResolvedValue(seen)
    render(<Scanner onDetect={onDetect} />)
    await frames(10)
    expect(onDetect).toHaveBeenCalledTimes(1)

    detect.mockResolvedValue([])
    await frames(11)
    detect.mockResolvedValue(seen)
    await frames()
    expect(onDetect).toHaveBeenCalledTimes(2)
  })

  it('does not read while paused', async () => {
    const onDetect = vi.fn()
    detect.mockResolvedValue([{ rawValue: '96385074', format: 'ean_8' }])
    const { rerender } = render(<Scanner onDetect={onDetect} paused />)
    await frames(3)
    expect(onDetect).not.toHaveBeenCalled()

    rerender(<Scanner onDetect={onDetect} paused={false} />)
    await frames()
    expect(onDetect).toHaveBeenCalledTimes(1)
  })

  it('reports a blocked camera and asks again on retry', async () => {
    getUserMedia.mockRejectedValueOnce(new DOMException('no', 'NotAllowedError'))
    render(<Scanner onDetect={vi.fn()} />)
    await frames()
    expect(screen.getByText('denied')).toBeInTheDocument()

    act(() => screen.getByRole('button', { name: 'retry' }).click())
    await frames()
    expect(screen.getByText('scanning')).toBeInTheDocument()
  })

  it('reports no camera as unavailable', async () => {
    getUserMedia.mockRejectedValueOnce(new DOMException('none', 'NotFoundError'))
    render(<Scanner onDetect={vi.fn()} />)
    await frames()
    expect(screen.getByText('unavailable')).toBeInTheDocument()
  })

  it('falls back to the ponyfill when the browser has no reader', async () => {
    vi.stubGlobal('BarcodeDetector', undefined)
    ponyfillDetect.mockResolvedValue([{ rawValue: '7802800000005', format: 'ean_13' }])
    const onDetect = vi.fn()
    render(<Scanner onDetect={onDetect} />)
    // The ponyfill is a real dynamic import, so wait for it instead of a frame.
    await vi.waitFor(() =>
      expect(onDetect).toHaveBeenCalledWith({ code: '7802800000005', format: 'ean_13' }),
    )
  })

  it('offers no torch when the camera has no light', async () => {
    getUserMedia.mockResolvedValue({
      getTracks: () => [{ stop: stopTrack }],
      getVideoTracks: () => [{ getCapabilities: () => ({}) }],
    })
    render(<Scanner onDetect={vi.fn()} />)
    await frames()
    expect(screen.queryByText(/torch/)).not.toBeInTheDocument()
  })

  it('turns the torch on and off when the camera supports it', async () => {
    const applyConstraints = vi.fn(async () => {})
    getUserMedia.mockResolvedValue({
      getTracks: () => [{ stop: stopTrack }],
      getVideoTracks: () => [{ getCapabilities: () => ({ torch: true }), applyConstraints }],
    })
    render(<Scanner onDetect={vi.fn()} />)
    await frames()

    await act(async () => screen.getByRole('button', { name: 'torch off' }).click())
    expect(applyConstraints).toHaveBeenLastCalledWith({ advanced: [{ torch: true }] })
    expect(screen.getByRole('button', { name: 'torch on' })).toBeInTheDocument()

    await act(async () => screen.getByRole('button', { name: 'torch on' }).click())
    expect(applyConstraints).toHaveBeenLastCalledWith({ advanced: [{ torch: false }] })
    expect(screen.getByRole('button', { name: 'torch off' })).toBeInTheDocument()
  })

  it('keeps the torch off when the camera refuses it', async () => {
    getUserMedia.mockResolvedValue({
      getTracks: () => [{ stop: stopTrack }],
      getVideoTracks: () => [
        {
          getCapabilities: () => ({ torch: true }),
          applyConstraints: vi.fn(async () => Promise.reject(new Error('busy'))),
        },
      ],
    })
    render(<Scanner onDetect={vi.fn()} />)
    await frames()
    await act(async () => screen.getByRole('button', { name: 'torch off' }).click())
    expect(screen.getByRole('button', { name: 'torch off' })).toBeInTheDocument()
  })

  it('releases the camera on unmount', async () => {
    const { unmount } = render(<Scanner onDetect={vi.fn()} />)
    await frames()
    unmount()
    expect(stopTrack).toHaveBeenCalled()
  })
})
