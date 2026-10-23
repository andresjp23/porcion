import { CircleAlert } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { normalizeBarcode } from '@/domain/barcode'
import { isIsoDate } from '@/domain/dates'
import { cx } from '@/lib/cx'
import { parseMeal } from '@/lib/meals'
import { focusRing } from '@/ui/styles'
import { BarcodeTakenError, useCreateFood } from './api'
import { FoodForm } from './FoodForm'

/**
 * Nuevo alimento (HU-09). `?barcode=` comes from the scanner, with `?name=`
 * and `?brand=` when Open Food Facts had an incomplete product; `?name=` alone
 * comes from a search that found nothing.
 */
export function CreateFoodPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const barcode = normalizeBarcode(params.get('barcode') ?? '')?.code ?? null
  // Passed on to the Detail of the new food, so it logs where the user came from.
  const detailParams = new URLSearchParams()
  const meal = parseMeal(params.get('meal'))
  const date = params.get('date')
  if (meal) detailParams.set('meal', meal)
  if (date && isIsoDate(date)) detailParams.set('date', date)
  const createFood = useCreateFood()

  return (
    <FoodForm
      title="Nuevo alimento"
      backTo="/add"
      barcode={barcode}
      defaultValues={{
        name: params.get('name')?.trim() ?? '',
        brand: params.get('brand')?.trim() ?? '',
        basis: 'g',
        kcal: '',
        protein: '',
        carbs: '',
        fat: '',
        portions: [],
        confirmAtwater: false,
      }}
      error={<SaveError error={createFood.error} />}
      onSubmit={async (values) => {
        try {
          const id = await createFood.mutateAsync({
            name: values.name,
            brand: values.brand,
            basis: values.basis,
            per100: {
              kcal: values.kcal,
              protein: values.protein,
              carbs: values.carbs,
              fat: values.fat,
            },
            barcode,
            portions: values.portions,
          })
          const query = detailParams.toString()
          void navigate(query ? `/foods/${id}?${query}` : `/foods/${id}`, { replace: true })
        } catch {
          // Shown from createFood.error.
        }
      }}
    />
  )
}
function SaveError({ error }: { error: Error | null }) {
  if (!error) return null
  const taken = error instanceof BarcodeTakenError
  return (
    <div role="alert" className="space-y-3 rounded-card border-2 border-ink p-4">
      <p className="flex items-start gap-2 font-bold text-ink">
        <CircleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
        {taken
          ? 'Ya existe un alimento con este código de barras.'
          : 'No pudimos guardar el alimento. Revisa tu conexión e inténtalo de nuevo.'}
      </p>
      {taken && error.foodId && (
        <Link
          to={`/foods/${error.foodId}`}
          replace
          className={cx(
            'inline-block font-extrabold text-ink underline underline-offset-4',
            focusRing,
          )}
        >
          Abrir ese alimento
        </Link>
      )}
    </div>
  )
}
