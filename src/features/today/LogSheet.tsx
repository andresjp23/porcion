import { CircleAlert, Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { Meal } from '@/domain/meal'
import { nutrientsForGrams, per100FromLogged } from '@/domain/nutrition'
import {
  amountGrams,
  amountLabel,
  GRAMS_STEP,
  PORTION_STEP,
  portionLabel,
  switchAmount,
  type Amount,
} from '@/features/foods/amount'
import { useFoodDetail, type FoodDetail } from '@/features/foods/api'
import { formatKcal } from '@/lib/format'
import { MEALS } from '@/lib/meals'
import { Button, Chip, Stepper } from '@/ui'
import { Sheet } from '@/ui/Sheet'
import { useUpdateLog, type LogEntry } from './api'

type LogSheetProps = {
  entry: LogEntry | null
  date: string
  onClose: () => void
  /** The parent offers Deshacer (HU-06 CA2). */
  onDelete: (entry: LogEntry) => void
}

/** HU-06 CA1: the amount, the meal and Eliminar for a logged food. */
export function LogSheet({ entry, date, onClose, onDelete }: LogSheetProps) {
  return (
    <Sheet open={entry !== null} onClose={onClose} title={entry?.foodName ?? ''}>
      {entry && (
        <LogForm
          key={entry.id}
          entry={entry}
          date={date}
          onClose={onClose}
          onDelete={() => onDelete(entry)}
        />
      )}
    </Sheet>
  )
}

type Food = Pick<FoodDetail, 'basis' | 'portions'>

function LogForm({
  entry,
  date,
  onClose,
  onDelete,
}: {
  entry: LogEntry
  date: string
  onClose: () => void
  onDelete: () => void
}) {
  // The food's portions, if it still exists. A deleted food is edited in grams.
  const detail = useFoodDetail(entry.foodId ?? '')
  if (entry.foodId && detail.isPending) {
    return <p className="font-semibold text-ink-muted">Cargando…</p>
  }
  const food: Food = detail.data
    ? { basis: detail.data.basis, portions: detail.data.portions }
    : { basis: 'g', portions: [] }
  return (
    <LogFormFields entry={entry} date={date} food={food} onClose={onClose} onDelete={onDelete} />
  )
}

function initialAmount(entry: LogEntry, food: Food): Amount {
  const portion = food.portions.find((p) => p.id === entry.portionId)
  return portion
    ? { kind: 'portion', portionId: portion.id, quantity: entry.quantity }
    : { kind: 'grams', grams: entry.grams }
}

function LogFormFields({
  entry,
  date,
  food,
  onClose,
  onDelete,
}: {
  entry: LogEntry
  date: string
  food: Food
  onClose: () => void
  onDelete: () => void
}) {
  const [amount, setAmount] = useState<Amount>(() => initialAmount(entry, food))
  const [meal, setMeal] = useState<Meal>(entry.meal)
  const update = useUpdateLog(date)
  // R-02: rescale this log's own snapshot, not the food as it is today.
  const per100 = per100FromLogged(entry.nutrients, entry.grams)
  const grams = amountGrams(food, amount)
  const nutrients = nutrientsForGrams(per100, grams)

  async function save() {
    try {
      await update.mutateAsync({
        id: entry.id,
        changes: {
          meal,
          portionId: amount.kind === 'portion' ? amount.portionId : null,
          quantity: amount.kind === 'portion' ? amount.quantity : amount.grams,
          grams,
          nutrients,
        },
      })
      onClose()
    } catch {
      // Shown below from update.error.
    }
  }

  return (
    <div className="space-y-5">
      <p className="text-on-surface-muted">
        <span className="text-4xl font-extrabold text-ink tabular-nums">
          {formatKcal(nutrients.kcal)}
        </span>{' '}
        <span className="font-bold text-ink-muted">kcal · {amountLabel(food, amount)}</span>
      </p>

      <div className="space-y-3">
        {food.portions.length > 0 && (
          <div role="group" aria-label="Porción" className="flex flex-wrap gap-2">
            {food.portions.map((portion) => (
              <Chip
                key={portion.id}
                selected={amount.kind === 'portion' && amount.portionId === portion.id}
                onClick={() => setAmount(switchAmount(food, amount, portion.id))}
              >
                {portionLabel(portion, food.basis)}
              </Chip>
            ))}
            <Chip
              selected={amount.kind === 'grams'}
              onClick={() => setAmount(switchAmount(food, amount, 'grams'))}
            >
              {food.basis === 'ml' ? 'Mililitros' : 'Gramos'}
            </Chip>
          </div>
        )}
        {amount.kind === 'portion' ? (
          <Stepper
            label="Cantidad de porciones"
            value={amount.quantity}
            step={PORTION_STEP}
            unit={amount.quantity === 1 ? 'porción' : 'porciones'}
            onChange={(quantity) => setAmount({ ...amount, quantity })}
          />
        ) : (
          <Stepper
            label={food.basis === 'ml' ? 'Mililitros' : 'Gramos'}
            value={amount.grams}
            step={GRAMS_STEP}
            unit={food.basis}
            onChange={(value) => setAmount({ kind: 'grams', grams: value })}
          />
        )}
      </div>

      <div role="group" aria-label="Comida" className="flex flex-wrap gap-2">
        {MEALS.map((option) => (
          <Chip
            key={option.value}
            selected={option.value === meal}
            onClick={() => setMeal(option.value)}
          >
            {option.label}
          </Chip>
        ))}
      </div>

      {update.error && (
        <p role="alert" className="flex items-center gap-2 font-bold text-ink">
          <CircleAlert aria-hidden="true" className="size-5 shrink-0" />
          No pudimos guardar el cambio. Inténtalo de nuevo.
        </p>
      )}

      <div className="flex gap-3">
        <Button
          variant="secondary"
          icon={<Trash2 aria-hidden="true" className="size-5" />}
          onClick={onDelete}
        >
          Eliminar
        </Button>
        <Button fullWidth disabled={update.isPending || grams <= 0} onClick={() => void save()}>
          {update.isPending ? 'Guardando…' : 'Guardar'}
        </Button>
      </div>
    </div>
  )
}
