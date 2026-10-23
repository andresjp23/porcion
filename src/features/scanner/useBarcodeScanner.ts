import { useCallback, useEffect, useRef, useState } from 'react'
import { normalizeBarcode, type Barcode, type BarcodeFormat } from '@/domain/barcode'
import { getDetector, SCAN_FORMATS } from './detector'

export type ScannerStatus =
  /** Asking for the camera or loading the reader. */
  | 'starting'
  | 'scanning'
  /** The user (or the browser settings) blocked the camera. */
  | 'denied'
  /** No camera, camera in use, insecure page or the reader failed to load. */
  | 'unavailable'

type Options = {
  /** Called with each valid code, already normalized (see `normalizeBarcode`). */
  onDetect: (barcode: Barcode) => void
  /** Keeps the camera on but stops reading (e.g. while a result is shown). */
  paused?: boolean
  /**
   * The same code is ignored until it has been out of sight this long, so a
   * product held in front of the camera counts once (continuous mode).
   */
  repeatAfterMs?: number
}

const FRAME_INTERVAL_MS = 200

// `torch` is not in the DOM typings yet; only Chrome on Android exposes it.
type TorchCapabilities = MediaTrackCapabilities & { torch?: boolean }
type TorchConstraintSet = MediaTrackConstraintSet & { torch?: boolean }

function supportsTorch(track: MediaStreamTrack | undefined): track is MediaStreamTrack {
  const capabilities = track?.getCapabilities?.() as TorchCapabilities | undefined
  return capabilities?.torch === true
}

function isScanFormat(format: string): format is BarcodeFormat {
  return (SCAN_FORMATS as string[]).includes(format)
}

function statusForCameraError(error: unknown): ScannerStatus {
  const name = error instanceof DOMException ? error.name : ''
  return name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'unavailable'
}

/**
 * Opens the rear camera into `videoRef` and reads EAN/UPC codes from it.
 * Codes with a bad check digit are skipped silently. The camera is released
 * on unmount; `retry` asks for it again (after the user allows it).
 * `torch` is null unless the camera can turn its light on.
 */
export function useBarcodeScanner({ onDetect, paused = false, repeatAfterMs = 2000 }: Options) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [status, setStatus] = useState<ScannerStatus>('starting')
  const [attempt, setAttempt] = useState(0)
  const [torchTrack, setTorchTrack] = useState<MediaStreamTrack | null>(null)
  const [torchOn, setTorchOn] = useState(false)

  // Read on every frame without restarting the camera when they change.
  const onDetectRef = useRef(onDetect)
  const pausedRef = useRef(paused)
  useEffect(() => {
    onDetectRef.current = onDetect
    pausedRef.current = paused
  })

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    let cancelled = false
    let stream: MediaStream | null = null
    let timer: ReturnType<typeof setTimeout> | undefined
    let last: { code: string; seenAt: number } | null = null

    async function start(video: HTMLVideoElement) {
      setStatus('starting')
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus('unavailable')
        return
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        })
      } catch (error) {
        if (!cancelled) setStatus(statusForCameraError(error))
        return
      }
      if (cancelled) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }

      let detector
      try {
        detector = await getDetector()
      } catch {
        if (!cancelled) setStatus('unavailable')
        return
      }
      if (cancelled) return

      // iOS needs these for the preview to play inline and without a tap.
      video.muted = true
      video.playsInline = true
      video.srcObject = stream
      await video.play().catch(() => {})
      if (cancelled) return
      setStatus('scanning')
      const track = stream.getVideoTracks?.()[0]
      if (supportsTorch(track)) setTorchTrack(track)

      const tick = async () => {
        if (cancelled) return
        if (!pausedRef.current && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
          const results = await detector.detect(video).catch(() => [])
          if (cancelled) return
          const barcode = results
            .map(({ rawValue, format }) =>
              normalizeBarcode(rawValue, isScanFormat(format) ? format : undefined),
            )
            .find((barcode) => barcode !== null)
          if (barcode) {
            const now = Date.now()
            const isRepeat = last?.code === barcode.code && now - last.seenAt < repeatAfterMs
            last = { code: barcode.code, seenAt: now }
            if (!isRepeat) onDetectRef.current(barcode)
          }
        }
        timer = setTimeout(() => void tick(), FRAME_INTERVAL_MS)
      }
      void tick()
    }

    void start(video)
    return () => {
      cancelled = true
      clearTimeout(timer)
      stream?.getTracks().forEach((track) => track.stop())
      video.srcObject = null
      // Stopping the track also turns its light off.
      setTorchTrack(null)
      setTorchOn(false)
    }
  }, [attempt, repeatAfterMs])

  const retry = useCallback(() => setAttempt((n) => n + 1), [])

  const toggleTorch = useCallback(() => {
    if (!torchTrack) return
    const next = !torchOn
    const constraints: TorchConstraintSet = { torch: next }
    // Only flip the button once the camera accepted it; otherwise it stays as it was.
    torchTrack
      .applyConstraints({ advanced: [constraints] })
      .then(() => setTorchOn(next))
      .catch(() => {})
  }, [torchTrack, torchOn])

  const torch = torchTrack ? { on: torchOn, toggle: toggleTorch } : null

  return { videoRef, status, retry, torch }
}
