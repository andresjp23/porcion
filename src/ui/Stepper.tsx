import { Minus, Plus } from 'lucide-react'
import { useState } from 'react'
import { cx } from '@/lib/cx'
import { formatGrams } from '@/lib/format'
import { IconButton } from './IconButton'
import { focusRing } from './styles'

type StepperProps = {
  /** Accessible name of the quantity field, e.g. "Cantidad". */
  label: string
  value: number
  onChange: (value: number) => void
  step: number
  min?: number
  /** Unit shown under the value, e.g. "unidad" or "g". */
  unit: string
}

function parseDecimal(text: string) {
  const value = Number(text.replace(',', '.'))
  return Number.isFinite(value) ? value : null
}

export function Stepper({ label, value, onChange, step, min = 0, unit }: StepperProps) {
  // Draft text while the user types; null means "show the committed value".
  const [draft, setDraft] = useState<string | null>(null)

  const commit = () => {
    if (draft === null) return
    const parsed = parseDecimal(draft)
    if (parsed !== null && parsed > min) onChange(parsed)
    setDraft(null)
  }

  const decrease = () => onChange(Math.max(min, value - step))
  const canDecrease = value - step > min

  return (
    <div className="flex items-center justify-between rounded-card-lg border border-surface-2 bg-surface p-2">
      <IconButton
        label={`Restar ${formatGrams(step)}`}
        icon={<Minus aria-hidden="true" />}
        variant="subtle"
        size="lg"
        className="size-13"
        onClick={decrease}
        disabled={!canDecrease}
      />
      <div className="flex flex-col items-center">
        <input
          aria-label={label}
          inputMode="decimal"
          value={draft ?? formatGrams(value)}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') commit()
          }}
          className={cx(
            'h-12 w-28 rounded-field bg-transparent text-center text-4xl font-extrabold text-on-surface',
            focusRing,
          )}
        />
        <span className="text-sm font-bold text-on-surface-muted">{unit}</span>
      </div>
      <IconButton
        label={`Sumar ${formatGrams(step)}`}
        icon={<Plus aria-hidden="true" />}
        variant="subtle"
        size="lg"
        className="size-13"
        onClick={() => onChange(value + step)}
      />
    </div>
  )
}
