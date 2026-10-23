import { ChevronLeft, CircleAlert, Flag, Info, Pencil, SearchX, Star } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { nutrientsForGrams } from '@/domain/nutrition'
import { isUnderReview } from '@/domain/reports'
import { useAddLog } from '@/features/today/api'
import { useLogDate } from '@/features/today/useLogDate'
import { cx } from '@/lib/cx'
import { formatDay, formatGrams, formatKcal } from '@/lib/format'
import { MEALS } from '@/lib/meals'
import { useGoBack } from '@/lib/useGoBack'
import { Button, Card, Chip, EmptyState, IconButton, Stepper, type Macro } from '@/ui'
import { focusRing, pressable } from '@/ui/styles'
import {
  amountGrams,
  amountLabel,
  GRAMS_STEP,
  initialAmount,
  PORTION_STEP,
  portionLabel,
  switchAmount,
  type Amount,
} from './amount'
import {
  useCanEditFood,
  useFoodDetail,
  useHasOpenReport,
  useIsFavorite,
  useToggleFavorite,
  type FoodDetail,
} from './api'
import { ReportSheet } from './ReportSheet'
import { foodDisplayName } from './serving'
import { useMealParam } from './useMealParam'

const SOURCE_LABELS: Record<FoodDetail['source'], string> = {
  seed: 'Base de alimentos',
  user: 'Aporte de la comunidad',
  // Attribution required by the Open Food Facts license (design §4).
  off: 'Datos de Open Food Facts',
}

const MACROS: ReadonlyArray<{ macro: Macro; label: string; dot: string }> = [
  { macro: 'protein', label: 'Proteína', dot: 'bg-protein' },
  { macro: 'carbs', label: 'Carbos', dot: 'bg-carbs' },
  { macro: 'fat', label: 'Grasas', dot: 'bg-fat' },
]

/** Detalle de alimento (HU-05). */
export function FoodDetailPage() {
  const { id = '' } = useParams()
  const detail = useFoodDetail(id)
  const goBack = useGoBack('/add')

  if (detail.data) return <FoodDetailView key={detail.data.id} food={detail.data} />

  return (
    <main className="mx-auto min-h-dvh max-w-md space-y-4 px-4 py-6">
      <IconButton
        label="Volver"
        icon={<ChevronLeft aria-hidden="true" />}
        size="lg"
        onClick={goBack}
      />
      {detail.data === null ? (
        <EmptyState
          icon={<SearchX aria-hidden="true" />}
          title="No encontramos este alimento"
          description="Puede que el enlace esté incompleto o que el alimento ya no exista."
        />
      ) : detail.isError ? (
        <EmptyState
          icon={<SearchX aria-hidden="true" />}
          title="No pudimos cargar el alimento"
          description="Revisa tu conexión e inténtalo de nuevo."
          action={
            <Button variant="secondary" onClick={() => void detail.refetch()}>
              Reintentar
            </Button>
          }
        />
      ) : (
        <p className="px-1 font-semibold text-ink-muted">Cargando…</p>
      )}
    </main>
  )
}

function FoodDetailView({ food }: { food: FoodDetail }) {
  const goBack = useGoBack('/add')
  const [meal, setMeal] = useMealParam()
  const [amount, setAmount] = useState<Amount>(() => initialAmount(food))
  const grams = amountGrams(food, amount)
  const nutrients = nutrientsForGrams(food.per100, grams)
  const mealLabel = MEALS.find((m) => m.value === meal)?.label ?? ''
  const navigate = useNavigate()
  const { date, isToday } = useLogDate()
  const addLog = useAddLog()

  // HU-05 CA4. Hoy already shows the entry (optimistic), but the Detail waits
  // for the server so a failure is not lost on another screen.
  async function add() {
    try {
      await addLog.mutateAsync({
        id: crypto.randomUUID(),
        date,
        meal,
        foodId: food.id,
        portionId: amount.kind === 'portion' ? amount.portionId : null,
        quantity: amount.kind === 'portion' ? amount.quantity : amount.grams,
        grams,
        foodName: foodDisplayName(food),
        nutrients,
      })
      void navigate(isToday ? '/' : `/?date=${date}`, { replace: true })
    } catch {
      // Shown below from addLog.error.
    }
  }

  return (
    <main className="mx-auto min-h-dvh max-w-md space-y-6 px-4 pt-6 pb-32">
      <header className="space-y-4">
        <div className="flex items-center justify-between">
          <IconButton
            label="Volver"
            icon={<ChevronLeft aria-hidden="true" />}
            size="lg"
            onClick={goBack}
          />
          <div className="flex items-center gap-2">
            {food.source === 'user' && <EditLink foodId={food.id} />}
            <FavoriteButton foodId={food.id} />
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-bold text-ink-muted">
            {[food.brand, SOURCE_LABELS[food.source]].filter(Boolean).join(' · ')}
          </p>
          <h1 className="text-3xl font-extrabold">{food.name}</h1>
        </div>
        {isUnderReview(food.openReports) && (
          <div className="flex gap-3 rounded-card border border-line p-4">
            <Info aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-ink" />
            <p className="font-semibold text-ink-soft">
              <strong className="font-extrabold text-ink">Datos en revisión.</strong> Varias
              personas reportaron un error en este alimento. Revisa los valores antes de usarlo.
            </p>
          </div>
        )}
      </header>

      <Card radius="lg" className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
          <p className="text-on-surface-muted">
            <span className="text-6xl leading-none font-extrabold text-accent tabular-nums">
              {formatKcal(nutrients.kcal)}
            </span>{' '}
            <span className="text-xl font-extrabold">kcal</span>
          </p>
          <p className="pb-1 font-bold text-on-surface-muted">{amountLabel(food, amount)}</p>
        </div>
        <dl className="grid grid-cols-3 gap-2">
          {MACROS.map(({ macro, label, dot }) => (
            <div key={macro} className="rounded-card bg-surface-2 p-3">
              <dt className="flex items-center gap-1.5 text-sm font-bold text-on-surface-muted">
                <span aria-hidden="true" className={cx('size-2.5 rounded-full', dot)} />
                {label}
              </dt>
              <dd className="mt-1 text-2xl font-extrabold tabular-nums">
                {formatGrams(nutrients[macro])} g
              </dd>
            </div>
          ))}
        </dl>
      </Card>

      <section aria-labelledby="portion-heading" className="space-y-3">
        <h2 id="portion-heading" className="text-lg font-extrabold">
          Porción
        </h2>
        <div role="group" aria-labelledby="portion-heading" className="flex flex-wrap gap-2">
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
      </section>

      <section aria-labelledby="meal-heading" className="space-y-3">
        <h2 id="meal-heading" className="text-lg font-extrabold">
          Comida
        </h2>
        <div role="group" aria-labelledby="meal-heading" className="flex flex-wrap gap-2">
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
      </section>

      {food.source === 'user' && <ReportSection foodId={food.id} />}

      <div className="fixed inset-x-0 bottom-0 bg-gradient-to-t from-bg via-bg to-transparent px-4 pt-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto max-w-md space-y-2">
          {addLog.error && (
            <p role="alert" className="flex items-center gap-2 font-bold text-ink">
              <CircleAlert aria-hidden="true" className="size-5 shrink-0" />
              No pudimos agregarlo. Inténtalo de nuevo.
            </p>
          )}
          {!isToday && (
            <p className="text-center text-sm font-bold text-ink-muted">
              Se agrega al {formatDay(date)}
            </p>
          )}
          <Button fullWidth disabled={addLog.isPending || grams <= 0} onClick={() => void add()}>
            {addLog.isPending
              ? 'Agregando…'
              : `Agregar a ${mealLabel} · ${formatKcal(nutrients.kcal)} kcal`}
          </Button>
        </div>
      </div>
    </main>
  )
}

function FavoriteButton({ foodId }: { foodId: string }) {
  const favorite = useIsFavorite(foodId)
  const toggle = useToggleFavorite(foodId)
  const isFavorite = favorite.data === true

  return (
    <IconButton
      label="Favorito"
      aria-pressed={isFavorite}
      icon={<Star aria-hidden="true" fill={isFavorite ? 'currentColor' : 'none'} />}
      size="lg"
      disabled={favorite.data === undefined}
      onClick={() => toggle.mutate(!isFavorite)}
    />
  )
}

/** HU-10: community foods can be reported, once per person until it is reviewed. */
function ReportSection({ foodId }: { foodId: string }) {
  const [open, setOpen] = useState(false)
  const reported = useHasOpenReport(foodId, true)

  if (reported.data === undefined) return null
  return (
    <section className="space-y-2">
      <p className="text-sm font-semibold text-ink-soft">
        Este alimento lo aportó alguien de la comunidad.
      </p>
      {reported.data ? (
        <p className="flex items-center gap-2 font-bold text-ink">
          <Flag aria-hidden="true" className="size-5 shrink-0" />
          Reportaste un error en este alimento. Gracias, lo vamos a revisar.
        </p>
      ) : (
        <Button
          variant="ghost"
          size="md"
          className="px-0"
          icon={<Flag aria-hidden="true" className="size-5" />}
          onClick={() => setOpen(true)}
        >
          Reportar un error
        </Button>
      )}
      <ReportSheet foodId={foodId} open={open} onClose={() => setOpen(false)} />
    </section>
  )
}

/** B-7b: only while the author may still edit it (R-11). */
function EditLink({ foodId }: { foodId: string }) {
  const [params] = useSearchParams()
  const canEdit = useCanEditFood(foodId, true)
  if (canEdit.data !== true) return null
  return (
    <Link
      to={`/foods/${foodId}/edit${params.size > 0 ? `?${params.toString()}` : ''}`}
      aria-label="Editar alimento"
      className={cx(
        'grid size-12 place-items-center rounded-full border border-surface-2 bg-surface text-accent',
        focusRing,
        pressable,
      )}
    >
      <Pencil aria-hidden="true" />
    </Link>
  )
}
