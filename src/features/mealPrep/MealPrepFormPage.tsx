import { CircleAlert } from 'lucide-react'
import { useNavigate, useParams } from 'react-router'
import { localDate } from '@/domain/dates'
import { useTimeZone } from '@/features/profile/useProfile'
import { formatGrams } from '@/lib/format'
import { Button, EmptyState } from '@/ui'
import { useMealPrep, useSaveMealPrep, type MealPrepRecord } from './api'
import { MealPrepForm } from './MealPrepForm'
import type { MealPrepInput, MealPrepValues } from './mealPrepSchema'

const EMPTY: MealPrepInput = { name: '', ingredients: [], cookedGrams: '', servings: '' }

/** Nuevo meal prep (HU-17): cooked today, in the user's time zone. */
export function NewMealPrepPage() {
  const navigate = useNavigate()
  const today = localDate(new Date(), useTimeZone())
  const save = useSaveMealPrep()

  return (
    <MealPrepForm
      title="Nuevo meal prep"
      submitLabel="Guardar meal prep"
      defaultValues={EMPTY}
      error={save.isError && <SaveError />}
      onSubmit={async (values) => {
        try {
          await save.mutateAsync(draftFrom(values, today))
          // MP-4 sends this to the batch's own page.
          void navigate('/foods', { replace: true })
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

  return (
    <MealPrepForm
      title="Editar meal prep"
      submitLabel="Guardar cambios"
      defaultValues={{
        name: prep.name,
        ingredients: prep.ingredients.map((ingredient) => ({
          foodId: ingredient.foodId,
          foodName: ingredient.foodName,
          per100: ingredient.per100,
          grams: formatGrams(ingredient.grams),
        })),
        cookedGrams: prep.cookedGrams === null ? '' : formatGrams(prep.cookedGrams),
        servings: prep.servings === null ? '' : String(prep.servings),
      }}
      error={save.isError && <SaveError />}
      onSubmit={async (values) => {
        try {
          await save.mutateAsync(draftFrom(values, prep.cookedOn))
          void navigate('/foods', { replace: true })
        } catch {
          // Shown from save.isError.
        }
      }}
    />
  )
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
