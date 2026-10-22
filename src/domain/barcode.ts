// Barcode normalization and GS1 check digits for EAN-8, EAN-13, UPC-A and
// UPC-E. Codes are stored in one canonical form so the same product never gets
// two rows: UPC-A and UPC-E become their EAN-13 equivalent, EAN-8 stays as is.

export type BarcodeFormat = 'ean_8' | 'ean_13' | 'upc_a' | 'upc_e'

export type Barcode = {
  /** Canonical digits: 13 for EAN-13, UPC-A and UPC-E; 8 for EAN-8. */
  code: string
  format: BarcodeFormat
}

/** GS1 check digit for the data digits (everything but the check digit). */
export function gtinCheckDigit(data: string) {
  let sum = 0
  // Weights alternate 3, 1, 3… starting from the rightmost data digit.
  for (let i = 0; i < data.length; i++) {
    const digit = Number(data[data.length - 1 - i])
    sum += i % 2 === 0 ? digit * 3 : digit
  }
  return (10 - (sum % 10)) % 10
}

function hasValidCheckDigit(digits: string) {
  return gtinCheckDigit(digits.slice(0, -1)) === Number(digits.at(-1))
}

/** Expands an 8-digit UPC-E (number system 0 or 1) to its 12-digit UPC-A. */
export function expandUpcE(upcE: string) {
  if (!/^[01]\d{7}$/.test(upcE)) return null
  const [ns, d1, d2, d3, d4, d5, d6, check] = upcE
  let body: string
  if (d6 === '0' || d6 === '1' || d6 === '2') body = `${d1}${d2}${d6}0000${d3}${d4}${d5}`
  else if (d6 === '3') body = `${d1}${d2}${d3}00000${d4}${d5}`
  else if (d6 === '4') body = `${d1}${d2}${d3}${d4}00000${d5}`
  else body = `${d1}${d2}${d3}${d4}${d5}0000${d6}`
  return `${ns}${body}${check}`
}

function parseAs(digits: string, format: BarcodeFormat): Barcode | null {
  switch (format) {
    case 'ean_13':
      return digits.length === 13 && hasValidCheckDigit(digits) ? { code: digits, format } : null
    case 'ean_8':
      return digits.length === 8 && hasValidCheckDigit(digits) ? { code: digits, format } : null
    case 'upc_a':
      return digits.length === 12 && hasValidCheckDigit(digits)
        ? { code: `0${digits}`, format }
        : null
    case 'upc_e': {
      const upcA = digits.length === 8 ? expandUpcE(digits) : null
      return upcA && hasValidCheckDigit(upcA) ? { code: `0${upcA}`, format } : null
    }
  }
}

/**
 * Cleans a scanned or typed code (spaces and hyphens allowed), checks its
 * check digit and returns it in canonical form, or null if it is not valid.
 * Pass the format when the scanner reports it; without it, 8 digits are tried
 * as EAN-8 first and then as UPC-E.
 */
export function normalizeBarcode(raw: string, format?: BarcodeFormat): Barcode | null {
  const digits = raw.replace(/[\s-]/g, '')
  if (!/^\d+$/.test(digits)) return null
  if (format) return parseAs(digits, format)
  switch (digits.length) {
    case 13:
      return parseAs(digits, 'ean_13')
    case 12:
      return parseAs(digits, 'upc_a')
    case 8:
      return parseAs(digits, 'ean_8') ?? parseAs(digits, 'upc_e')
    default:
      return null
  }
}
