import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronLeft, Info, Plus, ScanBarcode, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useFieldArray, useForm, useWatch, type Control } from 'react-hook-form'
import {
  batchGrams,
  cookedWeightLooksOff,
  MAX_MEAL_PREP_INGREDIENTS,
  per100Cooked,
  rawGrams,
  servingGrams,
  totalNutrients,
} from '@/domain/mealPrep'
import { nutrientsForGrams, type RecipeIngredient } from '@/domain/nutrition'
import { useFoodDetail, type FoodListItem } from '@/features/foods/api'
import { decimalText } from '@/features/foods/createFoodSchema'
import { foodDisplayName } from '@/features/foods/serving'
import { cx } from '@/lib/cx'
import { formatGrams, formatKcal } from '@/lib/format'
import { useGoBack } from '@/lib/useGoBack'
import { useNavigate } from 'react-router'
import { Button, Card, IconButton, Input } from '@/ui'
import { focusRing, pressable } from '@/ui/styles'
import { saveDraft, scanIngredientHref } from './ingredientReturn'
import { IngredientSheet } from './IngredientSheet'
import { mealPrepSchema, type MealPrepInput, type MealPrepValues } from './mealPrepSchema'
import { NutrientsRow } from './NutrientsRow'

type MealPrepFormProps = {
  title: string
  defaultValues: MealPrepInput
  onSubmit: (values: MealPrepValues) => Promise<void>
  submitLabel: string
  /** A failed save, shown above the button. */
  error?: ReactNode
  /** This form's own path, where the scanner comes back to (MP-3b). */
  returnPath: string
  /** A food just scanned or created, to add as an ingredient. */
  pendingIngredientId?: string | null
  /** Called once the pending ingredient was added (or was not found). */
  onPendingHandled?: () => void
}

/** HU-17: what was cooked, raw, and what it weighed once cooked. */
export function MealPrepForm({
  title,
  defaultValues,
  onSubmit,
  submitLabel,
  error,
  returnPath,
  pendingIngredientId,
  onPendingHandled,
}: MealPrepFormProps) {
  const navigate = useNavigate()
  const goBack = useGoBack('/meal-prep')
  const [picking, setPicking] = useState(false)
  const {
    control,
    register,
    handleSubmit,
    setFocus,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<MealPrepInput, unknown, MealPrepValues>({
    resolver: zodResolver(mealPrepSchema),
    defaultValues,
  })
  const ingredients = useFieldArray({ control, name: 'ingredients' })
  const submit = handleSubmit(onSubmit)

  /** Adds a raw ingredient with its per-100 g snapshot, and moves to its grams. */
  function addFood(food: Pick<FoodListItem, 'id' | 'name' | 'brand' | 'per100'>) {
    const index = ingredients.fields.length
    ingredients.append(
      { foodId: food.id, foodName: foodDisplayName(food), per100: food.per100, grams: '' },
      { shouldFocus: false },
    )
    // After a sheet gives focus back to its trigger.
    requestAnimationFrame(() => setFocus(`ingredients.${index}.grams`))
  }

  function scan() {
    saveDraft(returnPath, getValues())
    void navigate(scanIngredientHref(returnPath))
  }

  return (
    <main className="mx-auto min-h-dvh max-w-md px-4 pt-6 pb-32">
      <header className="mb-6 flex items-center gap-3">
        <IconButton
          label="Volver"
          icon={<ChevronLeft aria-hidden="true" />}
          size="lg"
          onClick={goBack}
        />
        <h1 className="text-3xl font-extrabold">{title}</h1>
      </header>

      <form noValidate onSubmit={(event) => void submit(event)} className="space-y-4">
        <Card radius="lg">
          <Input
            label="Nombre"
            placeholder="Pollo a la plancha"
            autoComplete="off"
            error={errors.name?.message}
            {...register('name')}
          />
        </Card>

        <section aria-labelledby="ingredients-heading" className="space-y-3">
          <div className="px-1">
            <h2 id="ingredients-heading" className="text-lg font-extrabold">
              Ingredientes en crudo
            </h2>
            <p className="text-sm font-semibold text-ink-soft">
              Con lo que pesaban antes de cocinar. El aceite también cuenta.
            </p>
          </div>
          {ingredients.fields.map((field, index) => (
            <Card key={field.id} className="flex items-start gap-3">
              <div className="min-w-0 flex-1 pt-1">
                {/* Wraps instead of truncating: "cruda" or "cocida" often comes last. */}
                <p className="font-extrabold [overflow-wrap:anywhere]">{field.foodName}</p>
                <p className="text-sm font-semibold text-on-surface-muted">
                  {formatKcal(field.per100.kcal)} kcal / 100 g
                </p>
              </div>
              <Input
                label={`Gramos de ${field.foodName}`}
                inputMode="decimal"
                placeholder="850"
                className="w-28 [&_label]:sr-only"
                error={errors.ingredients?.[index]?.grams?.message}
                {...register(`ingredients.${index}.grams`)}
              />
              <IconButton
                label={`Quitar ${field.foodName}`}
                icon={<Trash2 aria-hidden="true" />}
                variant="subtle"
                onClick={() => ingredients.remove(index)}
              />
            </Card>
          ))}
          {errors.ingredients?.root?.message || errors.ingredients?.message ? (
            <p role="alert" className="px-1 font-bold text-ink">
              {errors.ingredients.root?.message ?? errors.ingredients.message}
            </p>
          ) : null}
          {pendingIngredientId && (
            <PendingIngredient
              id={pendingIngredientId}
              onFound={(food) => {
                addFood(food)
                onPendingHandled?.()
              }}
              onMissing={() => onPendingHandled?.()}
            />
          )}
          {ingredients.fields.length < MAX_MEAL_PREP_INGREDIENTS && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPicking(true)}
                className={cx(dashedButton, 'flex-1 justify-between px-5 text-left')}
              >
                Agregar ingrediente
                <Plus aria-hidden="true" className="size-6" />
              </button>
              {/* MP-3b: the package of what is about to be cooked, e.g. a tray of chicken. */}
              <button
                type="button"
                aria-label="Escanear ingrediente"
                onClick={scan}
                className={cx(dashedButton, 'w-14 justify-center')}
              >
                <ScanBarcode aria-hidden="true" className="size-6" />
              </button>
            </div>
          )}
        </section>

        <Card radius="lg" className="space-y-4">
          <h2 className="text-lg font-extrabold">Ya cocinado</h2>
          <Input
            label="Peso cocido (g)"
            inputMode="decimal"
            placeholder="Opcional"
            hint="Pésalo todo junto al terminar, con la pesa tarada."
            error={errors.cookedGrams?.message}
            {...register('cookedGrams')}
          />
          <Input
            label="Porciones"
            inputMode="numeric"
            placeholder="Opcional"
            hint="Si lo dividiste en partes iguales, como tuppers."
            error={errors.servings?.message}
            {...register('servings')}
          />
        </Card>

        <Summary control={control} />

        {error}

        <div className="fixed inset-x-0 bottom-0 bg-gradient-to-t from-bg via-bg to-transparent px-4 pt-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto max-w-md">
            <Button type="submit" fullWidth disabled={isSubmitting}>
              {isSubmitting ? 'Guardando…' : submitLabel}
            </Button>
          </div>
        </div>
      </form>

      <IngredientSheet
        open={picking}
        onClose={() => setPicking(false)}
        onPick={(food) => {
          setPicking(false)
          addFood(food)
        }}
      />
    </main>
  )
}

const dashedButton = cx(
  'flex min-h-14 items-center rounded-card border-2 border-dashed border-ink-muted font-bold text-ink',
  focusRing,
  pressable,
)

/** Loads a food coming back from the scanner and adds it, once. */
function PendingIngredient({
  id,
  onFound,
  onMissing,
}: {
  id: string
  onFound: (food: Pick<FoodListItem, 'id' | 'name' | 'brand' | 'per100'>) => void
  onMissing: () => void
}) {
  const food = useFoodDetail(id)
  const done = useRef(false)
  useEffect(() => {
    if (done.current || food.isPending) return
    done.current = true
    if (food.data) onFound(food.data)
    else onMissing()
  }, [food.data, food.isPending, onFound, onMissing])
  return food.isPending ? (
    <p className="px-1 font-semibold text-ink-muted">Agregando el ingrediente…</p>
  ) : null
}

/** HU-17 CA5: totals, per 100 g cooked and per serving, while typing. */
function Summary({ control }: { control: Control<MealPrepInput, unknown, MealPrepValues> }) {
  const [fields, cookedText, servingsText] = useWatch({
    control,
    name: ['ingredients', 'cookedGrams', 'servings'],
  })
  const ingredients: RecipeIngredient[] = fields
    .map((field) => ({ per100: field.per100, grams: decimalText.parse(field.grams) }))
    .filter(({ grams }) => Number.isFinite(grams) && grams > 0)
  if (ingredients.length === 0) return null

  const cooked = decimalText.parse(cookedText)
  const cookedGrams = Number.isFinite(cooked) && cooked > 0 ? cooked : null
  const servings = Number(servingsText)
  const prep = {
    ingredients,
    cookedGrams,
    servings: Number.isInteger(servings) && servings > 0 ? servings : null,
  }
  const per100 = per100Cooked(prep)
  const perServing = servingGrams(prep)

  return (
    <section aria-labelledby="summary-heading" aria-live="polite">
      <Card radius="lg" className="space-y-3">
        <h2 id="summary-heading" className="text-lg font-extrabold">
          Resumen
        </h2>
        <NutrientsRow label="Todo el lote" nutrients={totalNutrients(ingredients)} />
        <NutrientsRow label={cookedGrams ? 'Por 100 g cocidos' : 'Por 100 g'} nutrients={per100} />
        {perServing !== null && (
          <NutrientsRow
            label={`Por porción (${formatGrams(perServing)} g)`}
            nutrients={nutrientsForGrams(per100, perServing)}
          />
        )}
        {cookedGrams === null && (
          <Note>
            Sin peso cocido usamos el peso crudo ({formatGrams(batchGrams(prep))} g). Pésalo al
            terminar para que sea exacto.
          </Note>
        )}
        {cookedGrams !== null && cookedWeightLooksOff(ingredients, cookedGrams) && (
          <Note>
            Pesa más de 3 veces lo crudo ({formatGrams(rawGrams(ingredients))} g). ¿Taraste la pesa
            con el recipiente?
          </Note>
        )}
      </Card>
    </section>
  )
}

function Note({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-2 text-sm font-semibold text-on-surface-muted">
      <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-accent" />
      {children}
    </p>
  )
}
