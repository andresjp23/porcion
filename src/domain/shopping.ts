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
