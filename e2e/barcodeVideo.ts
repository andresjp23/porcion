import { writeFileSync } from 'node:fs'

// A fake camera for the scanner (Q-1): Chromium plays a .y4m file as the
// webcam (--use-file-for-fake-video-capture). This draws an EAN-13 in it, so
// the test needs no image tools or binary fixtures in the repo.

const words = (text: string) => text.split(' ')

// Encoding tables of EAN-13, indexed by digit (and by first digit for PARITY).
const L = words('0001101 0011001 0010011 0111101 0100011 0110001 0101111 0111011 0110111 0001011')
const G = words('0100111 0110011 0011011 0100001 0011101 0111001 0000101 0010001 0001001 0010111')
const R = words('1110010 1100110 1101100 1000010 1011100 1001110 1010000 1000100 1001000 1110100')
const PARITY = 'LLLLLL LLGLGG LLGGLG LLGGGL LGLLGG LGGLLG LGGGLL LGLGLG LGLGGL LGGLGL'.split(' ')

/** The 95 modules of an EAN-13, as '1' (bar) and '0' (space). */
export function ean13Modules(code: string) {
  if (!/^\d{13}$/.test(code)) throw new Error(`Not an EAN-13: ${code}`)
  const digits = [...code].map(Number)
  const parity = PARITY[digits[0]!]!
  const left = digits
    .slice(1, 7)
    .map((digit, i) => (parity[i] === 'L' ? L : G)[digit])
    .join('')
  const right = digits
    .slice(7)
    .map((digit) => R[digit])
    .join('')
  return `101${left}01010${right}101`
}

const WIDTH = 640
const HEIGHT = 480
const MODULE_PX = 4
const BAR_HEIGHT = 260

/** Writes a two-frame 640×480 YUV 4:2:0 video of `code` on white. */
export function writeBarcodeVideo(path: string, code: string) {
  const modules = ean13Modules(code)
  const left = Math.floor((WIDTH - modules.length * MODULE_PX) / 2)
  const top = Math.floor((HEIGHT - BAR_HEIGHT) / 2)

  const luma = Buffer.alloc(WIDTH * HEIGHT, 255)
  for (let y = top; y < top + BAR_HEIGHT; y++) {
    for (let m = 0; m < modules.length; m++) {
      if (modules[m] !== '1') continue
      luma.fill(0, y * WIDTH + left + m * MODULE_PX, y * WIDTH + left + (m + 1) * MODULE_PX)
    }
  }
  const chroma = Buffer.alloc((WIDTH / 2) * (HEIGHT / 2) * 2, 128)
  const frame = Buffer.concat([Buffer.from('FRAME\n'), luma, chroma])

  const header = Buffer.from(`YUV4MPEG2 W${WIDTH} H${HEIGHT} F15:1 Ip A1:1 C420jpeg\n`)
  writeFileSync(path, Buffer.concat([header, frame, frame]))
}
