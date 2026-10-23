import { useState, type PointerEvent } from 'react'
import { addDays } from '@/domain/dates'
import type { TrendPoint } from '@/domain/trend'
import { formatDay, formatKg } from '@/lib/format'

const WIDTH = 320
const HEIGHT = 140
const PAD = { top: 10, right: 10, bottom: 10, left: 30 }

/** Whole-kg ticks (or every 2 or 5 kg) that cover the weights in view. */
function ticks(min: number, max: number) {
  const span = Math.max(max - min, 1)
  const step = span <= 4 ? 1 : span <= 10 ? 2 : 5
  const values: number[] = []
  for (let v = Math.floor(min / step) * step; v <= Math.ceil(max / step) * step; v += step) {
    values.push(v)
  }
  // A flat line still gets a band to sit in.
  if (values.length < 2) values.push(values[0]! + step)
  return values
}

function dayNumber(date: string) {
  return Date.parse(`${date}T00:00:00Z`) / 86_400_000
}

/**
 * HU-14 CA2: daily weights as dots and the trend as a line (R-06), over the
 * days of the period. Tapping or hovering reads the nearest day out.
 */
export function WeightChart({
  points,
  today,
  days,
}: {
  points: readonly TrendPoint[]
  today: string
  days: number
}) {
  const [selected, setSelected] = useState<number | null>(null)

  const weights = points.flatMap((p) => [p.weightKg, p.trendKg])
  const yTicks = ticks(Math.min(...weights), Math.max(...weights))
  const yMin = yTicks[0]!
  const yMax = yTicks.at(-1)!
  const first = dayNumber(addDays(today, 1 - days))
  const last = dayNumber(today)
  const x = (date: string) =>
    PAD.left +
    ((dayNumber(date) - first) / Math.max(last - first, 1)) * (WIDTH - PAD.left - PAD.right)
  const y = (kg: number) =>
    PAD.top + ((yMax - kg) / Math.max(yMax - yMin, 1)) * (HEIGHT - PAD.top - PAD.bottom)

  const trendPath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.date).toFixed(1)},${y(p.trendKg).toFixed(1)}`)
    .join(' ')
  const end = points.at(-1)!
  const point = selected === null ? null : points[selected]

  function select(event: PointerEvent<SVGSVGElement>) {
    const box = event.currentTarget.getBoundingClientRect()
    const pointerX = ((event.clientX - box.left) / box.width) * WIDTH
    let nearest = 0
    points.forEach((p, i) => {
      if (Math.abs(x(p.date) - pointerX) < Math.abs(x(points[nearest]!.date) - pointerX))
        nearest = i
    })
    setSelected(nearest)
  }

  return (
    <figure className="space-y-3">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full touch-pan-y"
        aria-hidden="true"
        onPointerDown={select}
        onPointerMove={select}
        onPointerLeave={() => setSelected(null)}
      >
        {yTicks.map((tick) => (
          <g key={tick}>
            <line
              x1={PAD.left}
              x2={WIDTH - PAD.right}
              y1={y(tick)}
              y2={y(tick)}
              className="stroke-surface-2"
              strokeWidth={1}
            />
            <text
              x={PAD.left - 6}
              y={y(tick)}
              textAnchor="end"
              dominantBaseline="middle"
              className="fill-on-surface-muted text-[11px] font-bold tabular-nums"
            >
              {tick}
            </text>
          </g>
        ))}
        {point && (
          <line
            x1={x(point.date)}
            x2={x(point.date)}
            y1={PAD.top}
            y2={HEIGHT - PAD.bottom}
            className="stroke-on-surface-muted"
            strokeWidth={1}
          />
        )}
        {points.map((p) => (
          <circle
            key={p.date}
            cx={x(p.date)}
            cy={y(p.weightKg)}
            r={4}
            className="fill-on-surface-muted stroke-surface"
            strokeWidth={2}
          />
        ))}
        <path
          d={trendPath}
          fill="none"
          className="stroke-accent"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle
          cx={x(end.date)}
          cy={y(end.trendKg)}
          r={5}
          className="fill-accent stroke-surface"
          strokeWidth={2}
        />
      </svg>

      <figcaption className="flex min-h-6 flex-wrap items-center gap-x-5 gap-y-1 text-base font-bold text-on-surface-muted">
        {point ? (
          <span className="text-on-surface">
            {formatDay(point.date)} · {formatKg(point.weightKg)} kg · tendencia{' '}
            {formatKg(point.trendKg)} kg
          </span>
        ) : (
          <>
            <span className="inline-flex items-center gap-2">
              <span aria-hidden="true" className="size-2.5 rounded-full bg-on-surface-muted" />
              Peso diario
            </span>
            <span className="inline-flex items-center gap-2">
              <span aria-hidden="true" className="h-1 w-4 rounded-full bg-accent" />
              Tendencia
            </span>
          </>
        )}
      </figcaption>

      <table className="sr-only">
        <caption>Peso diario y tendencia</caption>
        <thead>
          <tr>
            <th scope="col">Día</th>
            <th scope="col">Peso</th>
            <th scope="col">Tendencia</th>
          </tr>
        </thead>
        <tbody>
          {points.map((p) => (
            <tr key={p.date}>
              <th scope="row">{formatDay(p.date)}</th>
              <td>{formatKg(p.weightKg)} kg</td>
              <td>{formatKg(p.trendKg)} kg</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}
