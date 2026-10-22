import { trendChange, weightTrend } from './trend'

describe('weightTrend', () => {
  it('seeds the trend with the first weight', () => {
    expect(weightTrend([{ date: '2026-10-01', weightKg: 80 }])).toEqual([
      { date: '2026-10-01', weightKg: 80, trendKg: 80 },
    ])
  })

  it('applies an EMA with α = 0.1 (R-06)', () => {
    const points = weightTrend([
      { date: '2026-10-01', weightKg: 80 },
      { date: '2026-10-02', weightKg: 79 },
      { date: '2026-10-03', weightKg: 81 },
    ])
    expect(points.map((p) => p.trendKg)).toEqual([80, expect.closeTo(79.9), expect.closeTo(80.01)])
  })

  it('skips missing days instead of interpolating', () => {
    const points = weightTrend([
      { date: '2026-10-01', weightKg: 80 },
      { date: '2026-10-10', weightKg: 78 },
    ])
    expect(points).toHaveLength(2)
    expect(points[1]?.trendKg).toBeCloseTo(79.8)
  })

  it('sorts entries by date without mutating the input', () => {
    const entries = [
      { date: '2026-10-02', weightKg: 79 },
      { date: '2026-10-01', weightKg: 80 },
    ]
    const points = weightTrend(entries)
    expect(points.map((p) => p.date)).toEqual(['2026-10-01', '2026-10-02'])
    expect(entries[0]?.date).toBe('2026-10-02')
  })

  it('returns an empty list for no entries', () => {
    expect(weightTrend([])).toEqual([])
  })
})

describe('trendChange', () => {
  it('is the last trend minus the first', () => {
    const points = weightTrend([
      { date: '2026-10-01', weightKg: 80 },
      { date: '2026-10-02', weightKg: 78 },
    ])
    expect(trendChange(points)).toBeCloseTo(-0.2)
  })

  it('is 0 with fewer than 2 points', () => {
    expect(trendChange([])).toBe(0)
    expect(trendChange(weightTrend([{ date: '2026-10-01', weightKg: 80 }]))).toBe(0)
  })
})
