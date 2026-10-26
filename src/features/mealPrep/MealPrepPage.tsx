import { ChevronLeft, CircleAlert, Info, Pencil, Repeat } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { localDate } from '@/domain/dates'
import {
  batchGrams,
  daysSinceCooked,
  isFinished,
  per100Cooked,
  remainingGrams,
  servingGrams,
  shouldCheckFreshness,
} from '@/domain/mealPrep'
import { nutrientsForGrams } from '@/domain/nutrition'
import { useTimeZone } from '@/features/profile/useProfile'
import { cx } from '@/lib/cx'
import { formatGrams } from '@/lib/format'
import { useGoBack } from '@/lib/useGoBack'
import { Button, buttonClasses, Card, EmptyState, IconButton, Sheet } from '@/ui'
import { focusRing } from '@/ui/styles'
import {
  toMealPrep,
  useDeleteMealPrep,
  useMealPrep,
  useSetMealPrepFinished,
  type MealPrepRecord,
} from './api'
import { cookedAgoLabel, FRESHNESS_NOTE, remainingLabel } from './labels'
import { NutrientsRow } from './NutrientsRow'

/** A batch (HU-19): what is left, what it has, and what to do with it. */
export function MealPrepPage() {
  const { id } = useParams()
  const prep = useMealPrep(id)
  const goBack = useGoBack('/meal-prep')

  let content: ReactNode
  if (prep.isPending) {
    content = <p className="px-1 font-semibold text-ink-muted">Cargando…</p>
  } else if (prep.isError) {
    content = (
      <div className="text-center">
        <p className="font-bold">No pudimos cargar tu meal prep.</p>
        <Button size="md" className="mt-4" onClick={() => void prep.refetch()}>
          Reintentar
        </Button>
      </div>
    )
  } else if (!prep.data) {
    content = (
      <EmptyState
        icon={<CircleAlert aria-hidden="true" />}
        title="No encontramos este meal prep"
        description="Puede que lo hayas eliminado."
      />
    )
  }

  return (
    <main className="mx-auto min-h-dvh max-w-md space-y-4 px-4 pt-6 pb-12">
      <header className="flex items-center gap-3">
        <IconButton
          label="Volver"
          icon={<ChevronLeft aria-hidden="true" />}
          size="lg"
          onClick={goBack}
        />
        <h1 className="min-w-0 flex-1 text-3xl font-extrabold [overflow-wrap:anywhere]">
          {prep.data?.name ?? 'Meal prep'}
        </h1>
        {prep.data && (
          <Link
            to={`/meal-prep/${prep.data.id}/edit`}
            aria-label="Editar"
            className={cx(
              'grid size-12 shrink-0 place-items-center rounded-full bg-surface text-accent',
              focusRing,
            )}
          >
            <Pencil aria-hidden="true" className="size-5" />
          </Link>
        )}
      </header>
      {content ?? (prep.data && <Batch prep={prep.data} />)}
    </main>
  )
}

function Batch({ prep }: { prep: MealPrepRecord }) {
  const today = localDate(new Date(), useTimeZone())
  const batch = toMealPrep(prep)
  const finished = isFinished(batch)
  const per100 = per100Cooked(batch)
  const perServing = servingGrams(batch)
  const total = batchGrams(batch)
  const left = remainingGrams(batch)

  return (
    <>
      <Card radius="lg" className="space-y-3">
        <p className="text-sm font-bold text-on-surface-muted">
          {finished ? 'Terminado' : cookedAgoLabel(daysSinceCooked(prep.cookedOn, today))}
        </p>
        <p className="text-3xl font-extrabold">{remainingLabel(batch)}</p>
        <div
          role="meter"
          aria-label="Lo que queda"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={left}
          aria-valuetext={`${formatGrams(left)} de ${formatGrams(total)} g`}
          className="h-3 overflow-hidden rounded-full bg-surface-2"
        >
          <div
            className="h-full rounded-full bg-accent"
            style={{ width: `${(left / total) * 100}%` }}
          />
        </div>
        <p className="text-sm font-semibold text-on-surface-muted">
          {prep.cookedGrams === null
            ? `De ${formatGrams(total)} g en crudo: no se pesó cocido`
            : `De ${formatGrams(total)} g cocidos`}
        </p>
        {!finished && shouldCheckFreshness(prep.cookedOn, today) && (
          <p className="flex items-start gap-2 font-semibold">
            <Info aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-accent" />
            {FRESHNESS_NOTE}.
          </p>
        )}
      </Card>

      <Card radius="lg" className="space-y-3">
        <h2 className="text-lg font-extrabold">Lo que aporta</h2>
        <NutrientsRow
          label={prep.cookedGrams === null ? 'Por 100 g' : 'Por 100 g cocidos'}
          nutrients={per100}
        />
        {perServing !== null && (
          <NutrientsRow
            label={`Por porción (${formatGrams(perServing)} g)`}
            nutrients={nutrientsForGrams(per100, perServing)}
          />
        )}
      </Card>

      <Card radius="lg">
        <h2 className="mb-2 text-lg font-extrabold">Ingredientes en crudo</h2>
        <ul className="divide-y divide-surface-2">
          {prep.ingredients.map((ingredient, index) => (
            <li key={index} className="flex justify-between gap-3 py-2">
              <span className="font-bold [overflow-wrap:anywhere]">{ingredient.foodName}</span>
              <span className="shrink-0 font-semibold text-on-surface-muted">
                {formatGrams(ingredient.grams)} g
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <Actions prep={prep} finished={finished} canReactivate={finished && left > 0} />
    </>
  )
}

function Actions({
  prep,
  finished,
  canReactivate,
}: {
  prep: MealPrepRecord
  finished: boolean
  canReactivate: boolean
}) {
  const navigate = useNavigate()
  const setFinished = useSetMealPrepFinished(prep.id)
  const remove = useDeleteMealPrep(prep.id)
  const [confirming, setConfirming] = useState(false)

  return (
    <div className="space-y-3 pt-2">
      {!finished && (
        <Button
          variant="secondary"
          fullWidth
          disabled={setFinished.isPending}
          onClick={() => setFinished.mutate(true)}
        >
          Se terminó
        </Button>
      )}
      {canReactivate && (
        <Button
          variant="secondary"
          fullWidth
          disabled={setFinished.isPending}
          onClick={() => setFinished.mutate(false)}
        >
          Reactivar
        </Button>
      )}
      {/* HU-19 CA3: same ingredients, weighed again once cooked. */}
      <Link
        to={`/meal-prep/new?from=${prep.id}`}
        className={buttonClasses({ variant: 'secondary', fullWidth: true })}
      >
        <Repeat aria-hidden="true" className="size-5 text-accent" />
        Hacer de nuevo
      </Link>
      {setFinished.isError && (
        <p role="alert" className="font-bold">
          No pudimos guardar el cambio. Revisa tu conexión e inténtalo de nuevo.
        </p>
      )}
      <div className="text-center">
        <Button variant="ghost" size="md" onClick={() => setConfirming(true)}>
          Eliminar meal prep
        </Button>
      </div>

      <Sheet
        open={confirming}
        onClose={() => setConfirming(false)}
        title={`¿Eliminar ${prep.name}?`}
      >
        <p className="font-semibold text-ink-soft">
          Lo que ya registraste de este meal prep se queda en tus días, con sus calorías.
        </p>
        {remove.isError && (
          <p role="alert" className="mt-3 font-bold">
            No pudimos eliminarlo. Revisa tu conexión e inténtalo de nuevo.
          </p>
        )}
        <div className="mt-4 space-y-2">
          <Button
            variant="secondary"
            fullWidth
            disabled={remove.isPending}
            onClick={() =>
              remove.mutate(undefined, {
                onSuccess: () => void navigate('/meal-prep', { replace: true }),
              })
            }
          >
            {remove.isPending ? 'Eliminando…' : 'Eliminar'}
          </Button>
          <Button variant="ghost" size="md" fullWidth onClick={() => setConfirming(false)}>
            Cancelar
          </Button>
        </div>
      </Sheet>
    </div>
  )
}
