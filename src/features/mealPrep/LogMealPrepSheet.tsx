import { CircleAlert } from 'lucide-react'
import { useState } from 'react'
import { per100Cooked, servingGrams } from '@/domain/mealPrep'
import { gramsForPortion, nutrientsForGrams } from '@/domain/nutrition'
import type { Meal } from '@/domain/meal'
import { GRAMS_STEP, PORTION_STEP } from '@/features/foods/amount'
import { useAddLog } from '@/features/today/api'
import { formatGrams, formatKcal } from '@/lib/format'
import { Button, Chip, Sheet, Stepper } from '@/ui'
import { toMealPrep, type MealPrepRecord } from './api'
import { remainingLabel } from './labels'

type Amount = { kind: 'servings'; quantity: number } | { kind: 'grams'; grams: number }

type LogMealPrepSheetProps = {
  /** The batch being logged, or null while the sheet is closed. */
  prep: MealPrepRecord | null
  date: string
  meal: Meal
  mealLabel: string
  onClose: () => void
  onLogged: () => void
}

/** HU-18 CA2: a serving of a batch, in servings or cooked grams. */
export function LogMealPrepSheet({ prep, onClose, ...props }: LogMealPrepSheetProps) {
  return (
    <Sheet open={prep !== null} onClose={onClose} title={prep?.name ?? 'Meal prep'}>
      {/* Keyed so each batch starts from its own default amount. */}
      {prep && <LogForm key={prep.id} prep={prep} {...props} />}
    </Sheet>
  )
}

function LogForm({
  prep,
  date,
  meal,
  mealLabel,
  onLogged,
}: Omit<LogMealPrepSheetProps, 'prep' | 'onClose'> & { prep: MealPrepRecord }) {
  const addLog = useAddLog()
  const batch = toMealPrep(prep)
  const serving = servingGrams(batch)
  const [amount, setAmount] = useState<Amount>(
    serving === null ? { kind: 'grams', grams: 100 } : { kind: 'servings', quantity: 1 },
  )
  const grams =
    amount.kind === 'grams'
      ? amount.grams
      : gramsForPortion({ grams: serving ?? 0 }, amount.quantity)
  const nutrients = nutrientsForGrams(per100Cooked(batch), grams)

  async function add() {
    try {
      await addLog.mutateAsync({
        id: crypto.randomUUID(),
        date,
        meal,
        foodId: null,
        mealPrepId: prep.id,
        portionId: null,
        // Always grams: the edit sheet of Hoy (HU-06) reads a log without a portion that way.
        quantity: grams,
        grams,
        foodName: prep.name,
        nutrients,
      })
      onLogged()
    } catch {
      // Shown below from addLog.error.
    }
  }

  return (
    <div className="space-y-4">
      <p className="font-semibold text-ink-soft">{remainingLabel(batch)}</p>

      {serving !== null && (
        <div role="group" aria-label="Medida" className="flex flex-wrap gap-2">
          <Chip
            selected={amount.kind === 'servings'}
            onClick={() => setAmount({ kind: 'servings', quantity: 1 })}
          >
            Porción ({formatGrams(serving)} g)
          </Chip>
          <Chip
            selected={amount.kind === 'grams'}
            onClick={() => setAmount({ kind: 'grams', grams })}
          >
            Gramos
          </Chip>
        </div>
      )}
      {amount.kind === 'servings' ? (
        <Stepper
          label="Cantidad de porciones"
          value={amount.quantity}
          step={PORTION_STEP}
          unit={amount.quantity === 1 ? 'porción' : 'porciones'}
          onChange={(quantity) => setAmount({ kind: 'servings', quantity })}
        />
      ) : (
        <Stepper
          label="Gramos cocidos"
          value={amount.grams}
          step={GRAMS_STEP}
          unit="g cocidos"
          onChange={(value) => setAmount({ kind: 'grams', grams: value })}
        />
      )}

      <p aria-live="polite" className="text-center font-semibold text-ink-soft">
        {formatGrams(grams)} g · P {formatGrams(nutrients.protein)} · C{' '}
        {formatGrams(nutrients.carbs)} · G {formatGrams(nutrients.fat)} g
      </p>

      {addLog.error && (
        <p role="alert" className="flex items-center gap-2 font-bold text-ink">
          <CircleAlert aria-hidden="true" className="size-5 shrink-0" />
          No pudimos agregarlo. Inténtalo de nuevo.
        </p>
      )}
      <Button fullWidth disabled={addLog.isPending || grams <= 0} onClick={() => void add()}>
        {addLog.isPending
          ? 'Agregando…'
          : `Agregar a ${mealLabel} · ${formatKcal(nutrients.kcal)} kcal`}
      </Button>
    </div>
  )
}
