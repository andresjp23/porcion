// Picks the barcode reader: the browser's own BarcodeDetector when it reads
// EAN-13 (Chrome on Android), or the `barcode-detector` ponyfill elsewhere
// (Safari on iOS, desktop Firefox). The ponyfill is the same API on top of
// ZXing compiled to WebAssembly, so the rest of the app only knows one shape.

import type { BarcodeFormat } from '@/domain/barcode'

export const SCAN_FORMATS: BarcodeFormat[] = ['ean_13', 'ean_8', 'upc_a', 'upc_e']

export type DetectedCode = { rawValue: string; format: string }

export type Detector = {
  detect(source: HTMLVideoElement): Promise<DetectedCode[]>
}

type DetectorClass = {
  new (options: { formats: string[] }): Detector
  getSupportedFormats(): Promise<readonly string[]>
}

async function nativeDetector(): Promise<Detector | null> {
  const Native = (globalThis as { BarcodeDetector?: DetectorClass }).BarcodeDetector
  if (!Native) return null
  try {
    const supported = await Native.getSupportedFormats()
    const formats = SCAN_FORMATS.filter((format) => supported.includes(format))
    // Some desktop builds expose the class but read nothing.
    return formats.includes('ean_13') ? new Native({ formats }) : null
  } catch {
    return null
  }
}

async function ponyfillDetector(): Promise<Detector> {
  // Loaded only when needed, so browsers with a native reader never fetch it.
  const [{ BarcodeDetector, setZXingModuleOverrides }, { default: wasmUrl }] = await Promise.all([
    import('barcode-detector/ponyfill'),
    import('zxing-wasm/reader/zxing_reader.wasm?url'),
  ])
  // Serve the .wasm from our own build instead of the package's default CDN.
  setZXingModuleOverrides({
    locateFile: (path: string, prefix: string) =>
      path.endsWith('.wasm') ? wasmUrl : prefix + path,
  })
  return new BarcodeDetector({ formats: SCAN_FORMATS })
}

let detector: Promise<Detector> | null = null

/** The shared reader, created on first use. */
export function getDetector() {
  detector ??= nativeDetector()
    .then((native) => native ?? ponyfillDetector())
    .catch((error: unknown) => {
      detector = null // let a later attempt try again (e.g. the .wasm failed to load offline)
      throw error
    })
  return detector
}

/** Test helper: forget the cached reader. */
export function resetDetector() {
  detector = null
}
