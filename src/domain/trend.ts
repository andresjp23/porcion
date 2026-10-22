// R-06: weight trend as an exponential moving average over daily entries.
// Days without an entry are skipped, not interpolated.

export const TREND_ALPHA = 0.1

export type WeightEntry = {
  /** ISO date, YYYY-MM-DD. */
  date: string
  weightKg: number
}

export type TrendPoint = WeightEntry & {
  trendKg: number
}

/**
 * Trend for each entry, oldest first. The first entry seeds the average; each
 * later one moves it by `α × (weight − previous trend)`.
 */
export function weightTrend(entries: readonly WeightEntry[]): TrendPoint[] {
  // ISO dates sort correctly as strings.
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date))
  const points: TrendPoint[] = []
  let trendKg: number | undefined
  for (const entry of sorted) {
    trendKg =
      trendKg === undefined ? entry.weightKg : trendKg + TREND_ALPHA * (entry.weightKg - trendKg)
    points.push({ ...entry, trendKg })
  }
  return points
}

/** Change in trend between the first and last point (HU-14 CA2); 0 if fewer than 2. */
export function trendChange(points: readonly TrendPoint[]) {
  const first = points.at(0)
  const last = points.at(-1)
  return first && last ? last.trendKg - first.trendKg : 0
}
