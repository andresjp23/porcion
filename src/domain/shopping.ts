// HU-11: shopping list rules shared by the list screen and the supermarket mode.

/** Mirrors the `shopping_list_items.label` check. */
export const MAX_ITEM_LABEL = 120

export type ListProgress = { checked: number; total: number }

/** "3 de 7 marcados": how many items are checked. */
export function listProgress(items: ReadonlyArray<{ checkedAt: string | null }>): ListProgress {
  return {
    checked: items.filter((item) => item.checkedAt !== null).length,
    total: items.length,
  }
}

/** What the matching needs of a list item. */
export type MatchableItem = {
  id: string
  label: string
  foodId: string | null
  barcode: string | null
  checkedAt: string | null
}

/** A scanned product: its canonical code and, when known, its food. */
export type ScannedProduct = {
  barcode: string
  foodId: string | null
  /** Name and brand, to match free-text items ("leche" → "Leche Entera Soprole"). */
  name: string | null
}

export type ItemMatch =
  /** HU-12 CA6: the code is already in the list. */
  | { kind: 'repeat'; itemId: string }
  /** HU-12 CA2: exactly one item fits; it gets marked. */
  | { kind: 'match'; itemId: string }
  /** HU-12 CA2: several fit; ask which one. */
  | { kind: 'ambiguous'; itemIds: string[] }
  /** HU-12 CA2: nothing fits; it becomes a new checked item. */
  | { kind: 'none' }

// Words that say nothing about the product ("pan de molde", "leche sin lactosa").
const STOPWORDS = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'en', 'con', 'y', 'a', 'al'])

/** Lower case, no accents, split in words. */
function words(text: string) {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word !== '' && !STOPWORDS.has(word))
}

/**
 * Whether a free-text label describes the product: every word of the label
 * starts a word of the product name ("leche" fits "Leche Entera Soprole",
 * "pan molde" fits "Pan de Molde Ideal", "pan" does not fit "Empanada").
 */
export function labelFits(label: string, productName: string) {
  const wanted = words(label)
  const have = words(productName)
  return wanted.length > 0 && wanted.every((word) => have.some((h) => h.startsWith(word)))
}

/**
 * HU-12: which item of the list a scan belongs to. Only items not scanned yet
 * and not checked by hand can be claimed. An item linked to the scanned food
 * wins over one whose text fits the name.
 */
export function matchScan(items: ReadonlyArray<MatchableItem>, product: ScannedProduct): ItemMatch {
  const repeat = items.find((item) => item.barcode === product.barcode)
  if (repeat) return { kind: 'repeat', itemId: repeat.id }

  const open = items.filter((item) => item.barcode === null && item.checkedAt === null)
  const byFood = product.foodId ? open.filter((item) => item.foodId === product.foodId) : []
  const candidates =
    byFood.length > 0
      ? byFood
      : product.name
        ? open.filter((item) => labelFits(item.label, product.name!))
        : []

  if (candidates.length === 1) return { kind: 'match', itemId: candidates[0]!.id }
  if (candidates.length > 1)
    return { kind: 'ambiguous', itemIds: candidates.map((item) => item.id) }
  return { kind: 'none' }
}

export type SessionSummary = { scanned: number; completed: number; pending: number }

/**
 * HU-12 CA5: what a supermarket session left. `scans` counts every scan,
 * repeats included; the items are the distinct products it touched.
 */
export function summarizeSession(
  scans: number,
  items: ReadonlyArray<{ foodId: string | null }>,
): SessionSummary {
  const pending = items.filter((item) => item.foodId === null).length
  return { scanned: scans, completed: items.length - pending, pending }
}

export type PendingCode = { barcode: string; label: string }

/**
 * HU-12 CA5, "Por completar": scanned codes still without a food, newest
 * first and once per code, though the same code may sit in several lists.
 */
export function pendingCodes(
  items: ReadonlyArray<{
    barcode: string | null
    foodId: string | null
    label: string
    createdAt: string
  }>,
): PendingCode[] {
  const seen = new Set<string>()
  return [...items]
    .filter((item) => item.barcode !== null && item.foodId === null)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .flatMap((item) => {
      if (seen.has(item.barcode!)) return []
      seen.add(item.barcode!)
      return [{ barcode: item.barcode!, label: item.label }]
    })
}

/** A pending item's label is the product name, unless it is only its code. */
export function isCodeLabel(label: string) {
  return label.startsWith('Código ')
}
