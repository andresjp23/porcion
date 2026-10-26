import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { writeBarcodeVideo } from './barcodeVideo'
import { BARCODE_VIDEO, SCANNED_CODE } from './config'

export default function globalSetup() {
  mkdirSync(dirname(BARCODE_VIDEO), { recursive: true })
  writeBarcodeVideo(BARCODE_VIDEO, SCANNED_CODE)
}
