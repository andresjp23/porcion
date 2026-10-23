import { weekKcal, weightPeriod } from './progress'

const TODAY = '2026-10-23'

describe('weightPeriod', () => {
  const entries = [
    { date: '2026-09-01', weightKg: 82 },
    { date: '2026-10-17', weightKg: 80 },
    { date: '2026-10-20', weightKg: 79 },
    { date: '2026-10-23', weightKg: 78 },
  ]

  it('keeps only the entries of the last 7 days, today included', () => {
    const { points } = weightPeriod(entries, TODAY, 'week')
    expect(points.map((p) => p.date)).toEqual(['2026-10-17', '2026-10-20', '2026-10-23'])
  })

  it('carries the trend from before the period instead of restarting it (R-06)', () => {
    const { points, changeKg } = weightPeriod(entries, TODAY, 'week')
    // 82 → 81.8 on 10-17, then 81.52, then 81.168.
    expect(points[0]!.trendKg).toBeCloseTo(81.8)
    expect(changeKg).toBeCloseTo(81.168 - 81.8)
  })

  it('reaches back 30 and 90 days', () => {
    expect(weightPeriod(entries, TODAY, 'month').points).toHaveLength(3)
    expect(weightPeriod(entries, TODAY, 'quarter').points).toHaveLength(4)
  })

  it('has no change with a single point, and ignores future dates', () => {
    const result = weightPeriod(
      [...entries, { date: '2026-10-24', weightKg: 70 }],
      '2026-10-20',
      'week',
    )
    expect(result.points.map((p) => p.date)).toEqual(['2026-10-17', '2026-10-20'])
    expect(weightPeriod([{ date: TODAY, weightKg: 78 }], TODAY, 'week').changeKg).toBe(0)
  })
})

describe('weekKcal', () => {
  it('sums each of the last 7 days, oldest first', () => {
    const { days } = weekKcal(
      [
        { date: '2026-10-17', kcal: 500 },
        { date: '2026-10-17', kcal: 700.5 },
        { date: '2026-10-23', kcal: 300 },
        { date: '2026-10-16', kcal: 999 },
      ],
      TODAY,
    )
    expect(days.map((d) => d.date)).toEqual([
      '2026-10-17',
      '2026-10-18',
      '2026-10-19',
      '2026-10-20',
      '2026-10-21',
      '2026-10-22',
      '2026-10-23',
    ])
    expect(days[0]).toEqual({ date: '2026-10-17', kcal: 1200.5, logged: true })
    expect(days[1]).toEqual({ date: '2026-10-18', kcal: 0, logged: false })
  })

  it('averages only the days with logs', () => {
    const { averageKcal } = weekKcal(
      [
        { date: '2026-10-21', kcal: 2000 },
        { date: '2026-10-22', kcal: 2200 },
      ],
      TODAY,
    )
    expect(averageKcal).toBe(2100)
  })

  it('has no average without logs', () => {
    expect(weekKcal([], TODAY).averageKcal).toBeNull()
  })
})
