import type { Nutrients } from '@/domain/nutrition'
import { formatGrams, formatKcal } from '@/lib/format'

/** "Por 100 g cocidos · 149 kcal / P 30,7 · C 0 · G 2,2 g", on a graphite card. */
export function NutrientsRow({ label, nutrients }: { label: string; nutrients: Nutrients }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="font-bold text-on-surface-muted">{label}</span>
      <span className="text-right font-semibold tabular-nums">
        <span className="font-extrabold">{formatKcal(nutrients.kcal)} kcal</span>
        <span className="block text-sm text-on-surface-muted">
          P {formatGrams(nutrients.protein)} · C {formatGrams(nutrients.carbs)} · G{' '}
          {formatGrams(nutrients.fat)} g
        </span>
      </span>
    </div>
  )
}
