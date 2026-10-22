import { expandUpcE, gtinCheckDigit, normalizeBarcode } from './barcode'

describe('gtinCheckDigit', () => {
  it('computes the GS1 check digit', () => {
    expect(gtinCheckDigit('400638133393')).toBe(1)
    expect(gtinCheckDigit('9638507')).toBe(4)
    expect(gtinCheckDigit('03600029145')).toBe(2)
  })

  it('returns 0 when the sum is a multiple of 10', () => {
    expect(gtinCheckDigit('000000000000')).toBe(0)
  })
})

describe('expandUpcE', () => {
  it.each([
    ['04252614', '042100005264'], // last data digit 0–2
    ['01234531', '012300000451'], // last data digit 3
    ['01234544', '012340000054'], // last data digit 4
    ['01234565', '012345000065'], // last data digit 5–9
  ])('expands %s to %s', (upcE, upcA) => {
    expect(expandUpcE(upcE)).toBe(upcA)
  })

  it('rejects codes with a number system other than 0 or 1', () => {
    expect(expandUpcE('24252614')).toBeNull()
  })
})

describe('normalizeBarcode', () => {
  it('keeps a valid EAN-13', () => {
    expect(normalizeBarcode('4006381333931')).toEqual({ code: '4006381333931', format: 'ean_13' })
  })

  it('keeps a valid EAN-8', () => {
    expect(normalizeBarcode('96385074')).toEqual({ code: '96385074', format: 'ean_8' })
  })

  it('turns a UPC-A into its EAN-13', () => {
    expect(normalizeBarcode('036000291452')).toEqual({ code: '0036000291452', format: 'upc_a' })
  })

  it('turns a UPC-E into the same EAN-13 as its UPC-A', () => {
    expect(normalizeBarcode('04252614', 'upc_e')).toEqual({
      code: '0042100005264',
      format: 'upc_e',
    })
    expect(normalizeBarcode('042100005264')?.code).toBe('0042100005264')
  })

  it('falls back to UPC-E for 8 digits that are not a valid EAN-8', () => {
    expect(normalizeBarcode('04252614')).toEqual({ code: '0042100005264', format: 'upc_e' })
  })

  it('removes spaces and hyphens', () => {
    expect(normalizeBarcode(' 400-6381 333931 ')?.code).toBe('4006381333931')
  })

  it.each([
    ['4006381333932', 'wrong check digit'],
    ['40063813339A1', 'letters'],
    ['12345', 'unsupported length'],
    ['', 'empty'],
  ])('rejects %s (%s)', (raw) => {
    expect(normalizeBarcode(raw)).toBeNull()
  })

  it('validates against the format the scanner reports', () => {
    expect(normalizeBarcode('4006381333931', 'ean_8')).toBeNull()
    expect(normalizeBarcode('96385074', 'ean_8')?.format).toBe('ean_8')
  })
})
