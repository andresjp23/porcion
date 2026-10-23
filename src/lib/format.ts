// Display-only formatting. Calculations never round (see CLAUDE.md).
const kcalFormat = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 })
const gramsFormat = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 })
const kgFormat = new Intl.NumberFormat('es-CL', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})
const factorFormat = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 3 })

/** Calories as an integer with Chilean grouping: 1187.4 → "1.187". */
export function formatKcal(value: number) {
  return kcalFormat.format(value)
}

/** Grams with at most one decimal and a decimal comma: 1.25 → "1,3". */
export function formatGrams(value: number) {
  return gramsFormat.format(value)
}

/** Body weight, always with one decimal as it is entered (HU-13 CA2): 78 → "78,0". */
export function formatKg(value: number) {
  return kgFormat.format(value)
}

/** Multipliers such as the activity factor, with a decimal comma: 1.375 → "1,375". */
export function formatFactor(value: number) {
  return factorFormat.format(value)
}

const dayFormat = new Intl.DateTimeFormat('es-CL', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
})

/** A calendar day as in the Hoy header: "2026-10-22" → "Jue 22 oct". */
export function formatDay(isoDate: string) {
  const parts = dayFormat.formatToParts(new Date(`${isoDate}T12:00:00Z`))
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value.replace('.', '') ?? ''
  const weekday = get('weekday')
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${get('day')} ${get('month')}`
}
