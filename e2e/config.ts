import { fileURLToPath } from 'node:url'

/** Not 5173, so the suite can run next to `npm run dev`. */
export const PORT = 5174

/** Valid check digit, and not in the seed. */
export const SCANNED_CODE = '7801234567894'

export const BARCODE_VIDEO = fileURLToPath(
  new URL('../test-results/.fake-camera/barcode.y4m', import.meta.url),
)
