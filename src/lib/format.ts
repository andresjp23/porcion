// Display-only formatting. Calculations never round (see CLAUDE.md).
const kcalFormat = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 })
const gramsFormat = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 })
const factorFormat = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 3 })

/** Calories as an integer with Chilean grouping: 1187.4 → "1.187". */
export function formatKcal(value: number) {
  return kcalFormat.format(value)
}

/** Grams with at most one decimal and a decimal comma: 1.25 → "1,3". */
export function formatGrams(value: number) {
  return gramsFormat.format(value)
}

/** Multipliers such as the activity factor, with a decimal comma: 1.375 → "1,375". */
export function formatFactor(value: number) {
  return factorFormat.format(value)
}
