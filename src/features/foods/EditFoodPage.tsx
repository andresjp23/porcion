import { ChevronLeft, CircleAlert, Clock } from 'lucide-react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { cx } from '@/lib/cx'
import { useGoBack } from '@/lib/useGoBack'
import { EmptyState, IconButton } from '@/ui'
import { focusRing, pressable } from '@/ui/styles'
import {
  EditWindowClosedError,
  useCanEditFood,
  useFoodDetail,
  useUpdateFood,
  type FoodDetail,
} from './api'
import type { CreateFoodInput } from './createFoodSchema'
import { FoodForm } from './FoodForm'

/** The stored value as typed, with a decimal comma and no rounding: 223.33 → "223,33". */
const toInput = (value: number) => String(value).replace('.', ',')

function formValues(food: FoodDetail): CreateFoodInput {
  return {
    name: food.name,
    brand: food.brand ?? '',
    basis: food.basis,
    kcal: toInput(food.per100.kcal),
    protein: toInput(food.per100.protein),
    carbs: toInput(food.per100.carbs),
    fat: toInput(food.per100.fat),
    // The default portion first: it is the one the form saves as default.
    portions: food.portions.map((p) => ({ id: p.id, name: p.name, grams: toInput(p.grams) })),
    confirmAtwater: false,
  }
}

/** Editar alimento (B-7b): the author, during the window of R-11. */
export function EditFoodPage() {
  const { id = '' } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const detail = useFoodDetail(id)
  const canEdit = useCanEditFood(id, Boolean(detail.data))
  const update = useUpdateFood(id)
  // Back to the Detail with the meal and the day the user came with.
  const detailHref = `/foods/${id}${params.size > 0 ? `?${params.toString()}` : ''}`
  const goBack = useGoBack(detailHref)

  if (detail.data && canEdit.data === true) {
    return (
      <FoodForm
        title="Editar alimento"
        backTo={detailHref}
        barcode={detail.data.barcode}
        defaultValues={formValues(detail.data)}
        error={
          update.error && (
            <p role="alert" className="flex items-start gap-2 font-bold text-ink">
              <CircleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
              {update.error instanceof EditWindowClosedError
                ? 'Ya no puedes editar este alimento: pasaron 24 horas o alguien más lo registró. Si ves un error, repórtalo desde su detalle.'
                : 'No pudimos guardar los cambios. Revisa tu conexión e inténtalo de nuevo.'}
            </p>
          )
        }
        onSubmit={async (values) => {
          try {
            await update.mutateAsync({
              name: values.name,
              brand: values.brand,
              basis: values.basis,
              per100: {
                kcal: values.kcal,
                protein: values.protein,
                carbs: values.carbs,
                fat: values.fat,
              },
              portions: values.portions,
            })
            void navigate(detailHref, { replace: true })
          } catch {
            // Shown from update.error.
          }
        }}
      />
    )
  }

  const loading = detail.isPending || (detail.data && canEdit.isPending)
  return (
    <main className="mx-auto min-h-dvh max-w-md space-y-4 px-4 py-6">
      <IconButton
        label="Volver"
        icon={<ChevronLeft aria-hidden="true" />}
        size="lg"
        onClick={goBack}
      />
      {loading ? (
        <p className="px-1 font-semibold text-ink-muted">Cargando…</p>
      ) : (
        <EmptyState
          icon={<Clock aria-hidden="true" />}
          title="Ya no puedes editar este alimento"
          description="Solo quien lo creó puede editarlo, durante 24 horas y mientras nadie más lo haya registrado. Si ves un error, repórtalo desde su detalle."
          action={
            <Link
              to={detailHref}
              replace
              className={cx(
                'inline-flex h-11 items-center justify-center rounded-pill bg-surface px-5 font-extrabold text-on-surface',
                focusRing,
                pressable,
              )}
            >
              Ver el alimento
            </Link>
          }
        />
      )}
    </main>
  )
}
