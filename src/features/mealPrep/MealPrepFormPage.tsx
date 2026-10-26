import { CircleAlert } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { localDate } from '@/domain/dates'
import { useTimeZone } from '@/features/profile/useProfile'
import { Button, EmptyState } from '@/ui'
import { useMealPrep, useSaveMealPrep, type MealPrepRecord } from './api'
import { clearDraft, readDraft } from './ingredientReturn'
import { MealPrepForm } from './MealPrepForm'
import type { MealPrepInput, MealPrepValues } from './mealPrepSchema'

const EMPTY: MealPrepInput = { name: '', ingredients: [], cookedGrams: '', servings: '' }
const NEW_PATH = '/meal-prep/new'

/**
 * Coming back from the scanner (MP-3b): `?resume=1` brings back what was
 * typed, and `?ingredient=` the food to add.
 */
function useResume(returnPath: string) {
  const [params, setParams] = useSearchParams()
  const [draft] = useState(() => (params.get('resume') === '1' ? readDraft(returnPath) : null))
  const handled = useCallback(
    () =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.delete('resume')
          next.delete('ingredient')
          return next
        },
        { replace: true },
      ),
    [setParams],
  )
  return { draft, ingredientId: params.get('ingredient'), handled }
}

/**
 * Nuevo meal prep (HU-17): cooked today, in the user's time zone. `?from=`
 * is "Hacer de nuevo" (HU-19 CA3): same ingredients, weighed again once cooked.
 */
export function NewMealPrepPage() {
  const [params] = useSearchParams()
  const resume = useResume(NEW_PATH)
  // A draft already has the copied ingredients in it.
  const fromId = resume.draft ? undefined : (params.get('from') ?? undefined)
  const source = useMealPrep(fromId)

  // Waits for the batch to copy, since the form reads its defaults once.
  if (fromId && source.isPending) {
    return <p className="p-6 font-semibold text-ink-muted">Cargando…</p>
  }
  const defaultValues: MealPrepInput =
    resume.draft ?? (source.data ? { ...valuesFrom(source.data), cookedGrams: '' } : EMPTY)
  return <NewForm defaultValues={defaultValues} resume={resume} />
}

function NewForm({
  defaultValues,
  resume,
}: {
  defaultValues: MealPrepInput
  resume: ReturnType<typeof useResume>
}) {
  const navigate = useNavigate()
  const today = localDate(new Date(), useTimeZone())
  const save = useSaveMealPrep()

  return (
    <MealPrepForm
      title="Nuevo meal prep"
      submitLabel="Guardar meal prep"
      defaultValues={defaultValues}
      returnPath={NEW_PATH}
      pendingIngredientId={resume.ingredientId}
      onPendingHandled={resume.handled}
      error={save.isError && <SaveError />}
      onSubmit={async (values) => {
        try {
          const id = await save.mutateAsync(draftFrom(values, today))
          clearDraft(NEW_PATH)
          void navigate(`/meal-prep/${id}`, { replace: true })
        } catch {
          // Shown from save.isError.
        }
      }}
    />
  )
}

/** Editar meal prep (HU-17 CA6). What was already logged keeps its snapshot (R-02). */
export function EditMealPrepPage() {
  const { id } = useParams()
  const prep = useMealPrep(id)

  if (prep.isPending) {
    return <p className="p-6 font-semibold text-ink-muted">Cargando…</p>
  }
  if (prep.isError) {
    return (
      <main className="mx-auto max-w-md p-6 text-center">
        <p className="font-bold">No pudimos cargar tu meal prep.</p>
        <Button size="md" className="mt-4" onClick={() => void prep.refetch()}>
          Reintentar
        </Button>
      </main>
    )
  }
  if (!prep.data) {
    return (
      <main className="mx-auto max-w-md p-6">
        <EmptyState
          icon={<CircleAlert aria-hidden="true" />}
          title="No encontramos este meal prep"
          description="Puede que lo hayas eliminado."
        />
      </main>
    )
  }
  return <EditForm prep={prep.data} />
}

function EditForm({ prep }: { prep: MealPrepRecord }) {
  const navigate = useNavigate()
  const save = useSaveMealPrep(prep.id)
  const returnPath = `/meal-prep/${prep.id}/edit`
  const resume = useResume(returnPath)

  return (
    <MealPrepForm
      title="Editar meal prep"
      submitLabel="Guardar cambios"
      defaultValues={resume.draft ?? valuesFrom(prep)}
      returnPath={returnPath}
      pendingIngredientId={resume.ingredientId}
      onPendingHandled={resume.handled}
      error={save.isError && <SaveError />}
      onSubmit={async (values) => {
        try {
          await save.mutateAsync(draftFrom(values, prep.cookedOn))
          clearDraft(returnPath)
          void navigate(`/meal-prep/${prep.id}`, { replace: true })
        } catch {
          // Shown from save.isError.
        }
      }}
    />
  )
}

// Not formatGrams: it groups thousands ("1.700"), which reads back as 1,7.
const toInput = (value: number) => String(value).replace('.', ',')

/** A saved batch as form text. */
function valuesFrom(prep: MealPrepRecord): MealPrepInput {
  return {
    name: prep.name,
    ingredients: prep.ingredients.map((ingredient) => ({
      foodId: ingredient.foodId,
      foodName: ingredient.foodName,
      per100: ingredient.per100,
      grams: toInput(ingredient.grams),
    })),
    cookedGrams: prep.cookedGrams === null ? '' : toInput(prep.cookedGrams),
    servings: prep.servings === null ? '' : String(prep.servings),
  }
}

function draftFrom(values: MealPrepValues, cookedOn: string) {
  return {
    name: values.name,
    cookedOn,
    cookedGrams: values.cookedGrams,
    servings: values.servings,
    ingredients: values.ingredients,
  }
}

function SaveError() {
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-card border-2 border-ink p-4 font-bold text-ink"
    >
      <CircleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
      No pudimos guardar tu meal prep. Revisa tu conexión e inténtalo de nuevo.
    </p>
  )
}
