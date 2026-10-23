// HU-14: what Progreso shows for a period, from the raw entries.

import { addDays } from './dates'
import { trendChange, weightTrend, type TrendPoint, type WeightEntry } from './trend'

export type Period = 'week' | 'month' | 'quarter'

/** Days each period covers, today included. */
export const PERIOD_DAYS: Record<Period, number> = { week: 7, month: 30, quarter: 90 }

/** HU-14 CA4: fewer weights than this in the period show the empty state. */
export const MIN_WEIGHTS_FOR_CHART = 3

export type WeightPeriod = {
  /** The period's entries with their trend, oldest first. */
  points: TrendPoint[]
  /** Trend change from the first to the last point of the period (HU-14 CA2). */
  changeKg: number
}

/**
 * The trend runs over every entry, so the period starts from the trend it had
 * that day instead of resetting it to the first weight in view (R-06).
 */
export function weightPeriod(
  entries: readonly WeightEntry[],
  today: string,
  period: Period,
): WeightPeriod {
  const from = addDays(today, 1 - PERIOD_DAYS[period])
  const points = weightTrend(entries).filter((p) => p.date >= from && p.date <= today)
  return { points, changeKg: trendChange(points) }
}

export type DayKcal = { date: string; kcal: number; logged: boolean }

export type WeekKcal = {
  /** The last 7 days, oldest first, today last. Days without logs have 0 kcal. */
  days: DayKcal[]
  /** Average of the days with at least one log; null if none (HU-14 CA3). */
  averageKcal: number | null
}

/** HU-14 CA3: kcal of the last 7 days from the logs' (date, kcal) pairs. */
export function weekKcal(logs: readonly { date: string; kcal: number }[], today: string): WeekKcal {
  const days: DayKcal[] = Array.from({ length: 7 }, (_, i) => ({
    date: addDays(today, i - 6),
    kcal: 0,
    logged: false,
  }))
  for (const log of logs) {
    const day = days.find((d) => d.date === log.date)
    if (!day) continue
    day.kcal += log.kcal
    day.logged = true
  }
  const logged = days.filter((d) => d.logged)
  const averageKcal =
    logged.length === 0 ? null : logged.reduce((sum, d) => sum + d.kcal, 0) / logged.length
  return { days, averageKcal }
}
