import { useState } from 'react'
import type { DayKcal } from '@/domain/progress'
import { cx } from '@/lib/cx'
import { formatDay, formatKcal } from '@/lib/format'

const HEIGHT = 120
const BAR_WIDTH = 24
const RADIUS = 4
const WEEKDAYS = ['D', 'L', 'M', 'M', 'J', 'V', 'S']

function weekday(date: string) {
  return WEEKDAYS[new Date(`${date}T12:00:00Z`).getUTCDay()]!
}

/** A column with a 4 px rounded top and a square base. */
function barPath(x: number, height: number) {
  const top = HEIGHT - height
  const r = Math.min(RADIUS, height)
  return [
    `M${x},${HEIGHT}`,
    `V${top + r}`,
    `Q${x},${top} ${x + r},${top}`,
    `H${x + BAR_WIDTH - r}`,
    `Q${x + BAR_WIDTH},${top} ${x + BAR_WIDTH},${top + r}`,
    `V${HEIGHT}`,
    'Z',
  ].join(' ')
}

/**
 * HU-14 CA3: the kcal of the week as columns, with the target as a dashed
 * reference line. Going over it looks the same as staying under (R-08).
 */
export function KcalChart({ days, targetKcal }: { days: DayKcal[]; targetKcal: number | null }) {
  const [selected, setSelected] = useState<DayKcal | null>(null)
  const max = Math.max(targetKcal ?? 0, ...days.map((d) => d.kcal)) * 1.1 || 1
  const height = (kcal: number) => (kcal / max) * HEIGHT
  const slot = 320 / days.length
  const today = days.at(-1)?.date

  return (
    <figure className="space-y-2">
      <svg
        viewBox={`0 0 320 ${HEIGHT}`}
        className="w-full"
        aria-hidden="true"
        onPointerLeave={() => setSelected(null)}
      >
        {days.map((day, i) => {
          const x = i * slot + (slot - BAR_WIDTH) / 2
          return (
            <g
              key={day.date}
              onPointerEnter={() => setSelected(day)}
              onPointerDown={() => setSelected(day)}
            >
              {/* The whole slot answers the pointer, not only the painted bar. */}
              <rect x={i * slot} y={0} width={slot} height={HEIGHT} fill="transparent" />
              {day.kcal > 0 && (
                <path
                  d={barPath(x, height(day.kcal))}
                  className={cx(
                    day.date === today ? 'fill-accent' : 'fill-on-surface-muted',
                    selected && selected.date !== day.date && 'opacity-60',
                  )}
                />
              )}
            </g>
          )
        })}
        {targetKcal !== null && (
          <line
            x1={0}
            x2={320}
            y1={HEIGHT - height(targetKcal)}
            y2={HEIGHT - height(targetKcal)}
            className="stroke-on-surface"
            strokeWidth={1.5}
            strokeDasharray="6 5"
          />
        )}
      </svg>

      <div aria-hidden="true" className="grid grid-cols-7 text-center font-extrabold">
        {days.map((day) => (
          <span
            key={day.date}
            className={day.date === today ? 'text-accent' : 'text-on-surface-muted'}
          >
            {day.date === today ? 'Hoy' : weekday(day.date)}
          </span>
        ))}
      </div>

      <figcaption className="min-h-6 font-bold text-on-surface-muted">
        {selected ? (
          <span className="text-on-surface">
            {formatDay(selected.date)} ·{' '}
            {selected.logged ? `${formatKcal(selected.kcal)} kcal` : 'sin registros'}
          </span>
        ) : (
          targetKcal !== null && (
            <span className="inline-flex items-center gap-2">
              <span aria-hidden="true" className="w-4 border-t-2 border-dashed border-on-surface" />
              Meta {formatKcal(targetKcal)} kcal
            </span>
          )
        )}
      </figcaption>

      <table className="sr-only">
        <caption>Calorías de los últimos 7 días</caption>
        <thead>
          <tr>
            <th scope="col">Día</th>
            <th scope="col">Calorías</th>
          </tr>
        </thead>
        <tbody>
          {days.map((day) => (
            <tr key={day.date}>
              <th scope="row">{formatDay(day.date)}</th>
              <td>{day.logged ? `${formatKcal(day.kcal)} kcal` : 'Sin registros'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}
